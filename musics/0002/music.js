const fs = require('fs');
const path = require('path');

// 获取当前目录下的所有文件
const files = fs.readdirSync(__dirname);

// 找到第一个 JSON 文件
const jsonFile = files.find(file => path.extname(file).toLowerCase() === '.json');

if (!jsonFile) {
    console.error('No JSON file found in the current directory');
    process.exit(1);
}

const jsonFilePath = path.join(__dirname, jsonFile);
let jsonData;
try {
    jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
    console.log('JSON data read successfully:', jsonData);
} catch (error) {
    console.error('Failed to read JSON file:', error);
    process.exit(1);
}

// 初始化 road 值循环计数器
let roadValue = 1;

// 检查并更新 road 值
function updateRoadValues(data) {
    if (data && data.mode && data.mode.one && Array.isArray(data.mode.one.groups)) {
        data.mode.one.groups.forEach(item => {
            if (item.road === 1) {
                item.road = roadValue;
                roadValue = roadValue % 8 + 1; // 更新为下一个值，当达到8时重置为1
            }
        });
    } else {
        console.error('Invalid JSON structure');
        process.exit(1);
    }
}

// 更新 JSON 数据
updateRoadValues(jsonData);

// 将修改后的 JSON 数据写回文件
try {
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log('Road values updated successfully.');
} catch (error) {
    console.error('Failed to write JSON file:', error);
    process.exit(1);
}
