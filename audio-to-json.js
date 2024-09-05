const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Meyda = require('meyda');
const { AudioContext } = require('web-audio-api');

// 使用 ffmpeg 提取音频信息，包括采样率和时长
function getAudioInfo(inputFile) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputFile}" 2>&1 | grep "Audio"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error getting audio info: ${stderr}`);
      } else {
        const sampleRateMatch = stdout.match(/(\d+) Hz/); // 查找采样率
        if (sampleRateMatch) {
          const sampleRate = parseInt(sampleRateMatch[1]);
          resolve({ sampleRate });
        } else {
          reject("Could not find sample rate information");
        }
      }
    });
  });
}

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

// 将 segment 转换为 mm:ss:ms 的格式
function segmentToTime(segment, segmentDuration) {
  const totalSeconds = segment * segmentDuration;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
}

// 检测音频节拍的函数并生成 JSON 格式
function processBeatTracking(audioFilePath, sampleRate, outputJsonPath) {
  const bufferSize = 1024; // 每个片段的采样点数
  const segmentDuration = bufferSize / sampleRate; // 每个片段的时间长度

  fs.readFile(audioFilePath, (err, buffer) => {
    if (err) {
      console.error("Error reading the audio file:", err);
      return;
    }

    const context = new AudioContext();
    context.decodeAudioData(buffer, (audioBuffer) => {
      const channelData = audioBuffer.getChannelData(0);
      const musicData = {
        music: "Generated Track",
        number: "#1",
        level: "7",
        mode: {
          one: {
            groups: []
          }
        }
      };
      let lastHoldStartSegment = null;

      // 用于检测巅峰点的特征提取
      for (let i = 0; i < channelData.length; i += bufferSize) {
        const slice = channelData.slice(i, i + bufferSize);
        if (slice.length < bufferSize) break;

        const features = Meyda.extract(['rms', 'spectralCentroid', 'mfcc', 'zcr'], slice);
        const segment = i / bufferSize + 1;
        const { rms, spectralCentroid, mfcc, zcr } = features;
        const time = segmentToTime(segment, segmentDuration);
        const rail = Math.random() > 0.5 ? 'a' : 'b'; // 随机选择轨道
        const road = Math.floor(Math.random() * 8) + 1; // 随机选择1到8条小轨道

        // 检测节奏巅峰的人声和乐器
        if ((rms > 0.1 && mfcc[0] > 0.3) || (spectralCentroid > 3000 && zcr > 0.1)) {
          musicData.mode.one.groups.push({
            time: time,
            speed: 1,
            rail: rail,
            road: road
          });
          lastHoldStartSegment = null; // 重置长按起点
        }
      }

      // 将 JSON 数据写入文件
      fs.writeFileSync(outputJsonPath, JSON.stringify(musicData, null, 2));
      console.log('JSON 文件已生成:', outputJsonPath);
    });
  });
}

// 整个流程：提取音频 -> 获取采样率 -> 分析节拍 -> 生成 JSON
async function convertAudioToJSON(inputAudioPath, outputJsonPath) {
  try {
    const audioFilePath = path.join(__dirname, 'temp-audio-file.mp3');
    console.log('Extracting audio from MP4...');
    await extractAudioFromMP4(inputAudioPath, audioFilePath);
    console.log('Extracting audio information...');
    const { sampleRate } = await getAudioInfo(audioFilePath);
    console.log(`Sample rate: ${sampleRate}`);
    console.log('Processing beat tracking...');
    processBeatTracking(audioFilePath, sampleRate, outputJsonPath);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 检查命令行参数
if (process.argv.length < 3) {
  console.error('Usage: node audio-to-json.js <input_audio_file> [output_json_file]');
  process.exit(1);
}

const inputAudioPath = process.argv[2]; // 从命令行获取音频文件路径
const outputJsonPath = process.argv[3] || 'music_game_data.json'; // 从命令行获取输出 JSON 文件路径，如果未指定则为默认值

// 执行转换
convertAudioToJSON(inputAudioPath, outputJsonPath);