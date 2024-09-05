const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Meyda = require('meyda');
const { AudioContext } = require('web-audio-api');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// CSV 写入器
const csvWriter = createCsvWriter({
  path: 'music_game_segments.csv',
  header: [
    {id: 'segment', title: 'Segment'},
    {id: 'rms', title: 'RMS'},
    {id: 'spectralCentroid', title: 'SpectralCentroid'},
    {id: 'noteType', title: 'NoteType'} // 短打或长按
  ]
});

// 阈值和设置
const tapThreshold = 0.1; // 短打的 RMS 阈值
const holdThreshold = 0.07; // 长按的 RMS 阈值
const holdDuration = 3; // 持续多少个片段算长按

// 使用 ffmpeg 提取 MP4 中的音频轨道
function extractAudioFromMP4(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputFile}" -q:a 0 -map a "${outputFile}" -y`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error extracting audio: ${stderr}`);
      } else {
        resolve(outputFile);
      }
    });
  });
}

// 检测音频节拍的函数并筛选出适合游戏的片段
function processBeatTracking(audioFilePath) {
  fs.readFile(audioFilePath, (err, buffer) => {
    if (err) {
      console.error("Error reading the audio file:", err);
      return;
    }

    const context = new AudioContext();
    context.decodeAudioData(buffer, (audioBuffer) => {
      const channelData = audioBuffer.getChannelData(0);
      const bufferSize = 1024;
      let features;
      const records = [];

      let holdCount = 0; // 记录长按的持续段数

      for (let i = 0; i < channelData.length; i += bufferSize) {
        const slice = channelData.slice(i, i + bufferSize);
        if (slice.length < bufferSize) break;

        features = Meyda.extract(['rms', 'spectralCentroid'], slice);
        const segment = i / bufferSize + 1;
        const { rms } = features;

        if (rms > tapThreshold) {
          // 短打节奏
          records.push({
            segment: segment,
            rms: rms,
            spectralCentroid: features.spectralCentroid,
            noteType: 'Tap'
          });
          holdCount = 0; // 重置长按计数
        } else if (rms > holdThreshold) {
          // 可能是长按，持续检测
          holdCount++;
          if (holdCount >= holdDuration) {
            records.push({
              segment: segment - holdDuration + 1,
              rms: rms,
              spectralCentroid: features.spectralCentroid,
              noteType: 'Hold'
            });
            holdCount = 0; // 重置长按计数
          }
        } else {
          holdCount = 0; // 没有持续长按，重置计数
        }

        console.log(`Segment ${segment}: RMS = ${rms}, Centroid = ${features.spectralCentroid}`);
      }

      // 保存到 CSV 文件
      csvWriter.writeRecords(records)
        .then(() => console.log('Filtered music game segments saved to music_game_segments.csv'));

      cleanupAudioFile(audioFilePath);
    });
  });
}

// 清理临时文件
function cleanupAudioFile(audioFilePath) {
  fs.unlink(audioFilePath, (err) => {
    if (err) {
      console.error("Error deleting the temporary audio file:", err);
    } else {
      console.log("Temporary audio file deleted.");
    }
  });
}

// 获取用户传入的文件路径
const inputFilePath = process.argv[2];
if (!inputFilePath) {
  console.error('Please provide an MP3 or MP4 file.');
  process.exit(1);
}

const ext = path.extname(inputFilePath).toLowerCase();
const outputAudioFile = path.join(__dirname, 'temp-audio-file.mp3');

if (ext === '.mp3') {
  processBeatTracking(inputFilePath);
} else if (ext === '.mp4') {
  console.log('Extracting audio from MP4 file...');
  extractAudioFromMP4(inputFilePath, outputAudioFile)
    .then(() => {
      console.log('Audio extraction complete. Processing beat tracking...');
      processBeatTracking(outputAudioFile);
    })
    .catch((err) => {
      console.error('Error extracting audio from MP4 file:', err);
    });
} else {
  console.error('Unsupported file type. Please provide an MP3 or MP4 file.');
}