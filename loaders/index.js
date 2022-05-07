const fs = require('fs')
const path = require('path')
const { runLoaders } = require('../loader-runner')
const loaders = fs.readdirSync(__dirname).filter(e => !e.includes('index') && !e.includes('resource')).map(e => path.resolve(__dirname, e))


runLoaders({
  resource: path.resolve(__dirname, './resource.js'),
  loaders
}, (err, result) => {
  console.log('%c 🍇 result: ', 'font-size:20px;background-color: #33A5FF;color:#fff;', result);
})
