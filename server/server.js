const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data', 'custom_dictionaries.json');

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 确保数据目录存在
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取词典数据
function loadDicts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取词典失败:', error);
  }
  return [];
}

// 保存词典数据
function saveDicts(dicts) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dicts, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('保存词典失败:', error);
    return false;
  }
}

// API 路由

// 获取所有自定义词典
app.get('/api/custom-dicts', (req, res) => {
  const dicts = loadDicts();
  res.json(dicts);
});

// 保存所有自定义词典（覆盖）
app.post('/api/custom-dicts', (req, res) => {
  const { dicts } = req.body;
  
  if (!Array.isArray(dicts)) {
    return res.status(400).json({ error: '数据格式错误' });
  }
  
  const success = saveDicts(dicts);
  if (success) {
    res.json({ success: true, message: '保存成功' });
  } else {
    res.status(500).json({ error: '保存失败' });
  }
});

// 更新单个词典
app.put('/api/custom-dicts/:id', (req, res) => {
  const { id } = req.params;
  const updatedDict = req.body;
  
  const dicts = loadDicts();
  const index = dicts.findIndex(d => d.id === id);
  
  if (index !== -1) {
    dicts[index] = { ...updatedDict, updatedAt: Date.now() };
  } else {
    dicts.push({ ...updatedDict, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  const success = saveDicts(dicts);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '保存失败' });
  }
});

// 删除词典
app.delete('/api/custom-dicts/:id', (req, res) => {
  const { id } = req.params;
  
  let dicts = loadDicts();
  dicts = dicts.filter(d => d.id !== id);
  
  const success = saveDicts(dicts);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: '保存失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
  console.log(`数据文件: ${DATA_FILE}`);
});
