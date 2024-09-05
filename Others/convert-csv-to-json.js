const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// 假设每个 Segment 的时间间隔是 0.05 秒，或者使用 BPM 计算
const segmentDuration = 0.0232; // 每个片段对应的时间，单位秒（如果有BPM，可以调整）

// 将时间转换为 mm:ss:ms 格式
function segmentToTime(segment) {
  const totalSeconds = segment * segmentDuration;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`;
}

// 将 CSV 转换为音乐游戏的 JSON 格式
function convertCSVToJSON(inputCsvPath, outputJsonPath) {
  const results = [];
  const musicData = {
    music: "Hacking To The Gate - 命运石之门主题曲 - 推荐", // 用户手动设置的音乐名称
    number: "#6", // 用户手动设置的曲目编号
    level: "7", // 用户手动设置的难度级别
    mode: {
      one: {
        groups: []
      }
    }
  };

  let lastHoldStartSegment = null;

  fs.createReadStream(inputCsvPath)
    .pipe(csv())
    .on('data', (row) => {
      const segment = parseInt(row.Segment);
      const time = segmentToTime(segment);
      const rms = parseFloat(row.RMS);
      const spectralCentroid = parseFloat(row.SpectralCentroid);
      const noteType = row.NoteType;
      
      // 轨道分配逻辑，a和b在左右两边，road是1到8
      const rail = Math.random() > 0.5 ? 'a' : 'b'; // 随机选择a或b
      const road = Math.floor(Math.random() * 8) + 1; // 随机选择1到8条小轨道
      
      // 如果是短打
      if (noteType === 'Tap') {
        musicData.mode.one.groups.push({
          time: time,
          speed: 1, // 默认速度为1
          rail: rail,
          road: road
        });
      }

      // 如果是长按
      if (noteType === 'Hold') {
        if (lastHoldStartSegment === null) {
          lastHoldStartSegment = segment;
        } else {
          // 当前片段为长按结束片段，记录起始和结束时间
          const holdStartTime = segmentToTime(lastHoldStartSegment);
          const holdEndTime = segmentToTime(segment);
          musicData.mode.one.groups.push({
            time: `${holdStartTime},${holdEndTime}`,
            speed: 1,
            rail: rail,
            road: road
          });
          lastHoldStartSegment = null; // 重置长按开始片段
        }
      }
    })
    .on('end', () => {
      // 将 JSON 数据写入文件
      fs.writeFileSync(outputJsonPath, JSON.stringify(musicData, null, 2));
      console.log('JSON 文件已生成:', outputJsonPath);
    });
}

// 假设我们有一个输入的 CSV 文件路径和输出的 JSON 文件路径
const inputCsvPath = path.join(__dirname, 'music_game_segments.csv');
const outputJsonPath = path.join(__dirname, 'music_game_data.json');

// 执行转换
convertCSVToJSON(inputCsvPath, outputJsonPath);