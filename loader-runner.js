const fs = require('fs')

function createLoaderObject(loader) {
  // 获取loader函数
  let normal = require(loader)

  // 获取pitch函数
  let pitch = normal.pitch

  // 如果为true loader接收的是Buffer，否则是字符串
  let raw = normal.raw

  return {
    path: loader,
    normal,
    pitch,
    raw,
    data: {}, // 每个loader可以携带一个自定义的数据对象
    pitchExecuted: false, // pitch是否执行
    normalExecuted: false // normal是否执行
  }
}

function convertArgs(args, raw) {
  if (raw && !Buffer.isBuffer(args[0])) {
    args[0] = Buffer.from(args[0])
  } else if (!raw && Buffer.isBuffer(args[0])) {
    args[0] = args[0].toString()
  }
}

function iterateNormalLoaders(processOptions, loaderContext, args, pitchingCallback) {
  if (loaderContext.loaderIndex < 0) {
    return pitchingCallback(null, ...args)
  }
  let currentLoader = loaderContext.loaders[loaderContext.loaderIndex]
  if (currentLoader.normalExecuted) {
    loaderContext.loaderIndex--
    return iterateNormalLoaders(processOptions, loaderContext, args, pitchingCallback)
  }
  let normalFn = currentLoader.normal
  currentLoader.normalExecuted = true
  convertArgs(args, currentLoader.raw)
  runSyncOrAsync(normalFn, loaderContext, args, (err, ...returnArgs) => {
    return iterateNormalLoaders(processOptions, loaderContext, returnArgs, pitchingCallback)
  })
}


function processResource(processOptions, loaderContext, pitchingCallback) {
  processOptions.readResource(loaderContext.resource, (err, resourceBuffer) => {
    processOptions.resourceBuffer = resourceBuffer
    loaderContext.loaderIndex--
    // 迭代执行normal loader
    iterateNormalLoaders(processOptions, loaderContext, [resourceBuffer], pitchingCallback)
  })
}

function iteratePitchingLoader(processOptions, loaderContext, pitchingCallback) {
  // 从左向右执行，越界了，就可以读取文件了
  if (loaderContext.loaderIndex >= loaderContext.loaders.length) {
    return processResource(processOptions, loaderContext, pitchingCallback)
  }
  // 获取当前要执行的loader
  let currentLoader = loaderContext.loaders[loaderContext.loaderIndex]

  // 没有pitch的情况会执行
  if (currentLoader.pitchExecuted) {
    loaderContext.loaderIndex++
    return iteratePitchingLoader(processOptions, loaderContext, pitchingCallback)
  }
  let fn = currentLoader.pitch
  currentLoader.pitchExecuted = true
  // 没有pitch的情况会执行
  if (!fn) {
    return iteratePitchingLoader(processOptions, loaderContext, pitchingCallback)
  }

  runSyncOrAsync(fn, loaderContext, [
    loaderContext.remainingRequest,
    loaderContext.previousRequest,
    loaderContext.data
  ], (err, ...args) => {
    // pitch返回值不为空 跳过后续loader， 掉头执行前一个Loader的normal
    if (args.length && args.some(e => e)) {
      loaderContext.loaderIndex--
      iterateNormalLoaders(processOptions, loaderContext, args, pitchingCallback)
    } else {
      return iteratePitchingLoader(processOptions, loaderContext, pitchingCallback)
    }
  })
}

function runSyncOrAsync(fn, loaderContext, args, runCallback) {
  let isSync = true

  loaderContext.callback = (...args) => {
    runCallback(...args)
  }
  loaderContext.async = function() {
    isSync = false
    return loaderContext.callback
  }
  const result = fn.apply(loaderContext, args)
  if (isSync) {
    runCallback(null, result)
  }
}

function runLoaders(options, finalCallback) {
  const {
    resource, // 资源路径
    loaders = [], // loader配置
    context = {}, // 上下文对象
    readResource = fs.readFile
  } = options

  const loaderObjects = loaders.map(createLoaderObject)
  const loaderContext = context
  loaderContext.resource = resource
  loaderContext.loaders = loaderObjects
  loaderContext.readResource = readResource
  loaderContext.loaderIndex = 0 // 当前正在执行的Loader索引
  // 调用它会执行下一个loader
  loaderContext.callback = null
  // 默认Loader是同步的
  loaderContext.async = null

  Object.defineProperty(loaderContext, 'request', {
    get() {
      // loader1!loader2!loader3!./a.js
      return loaderContext.loaders
        .map(loader => loader.path)
        .concat(loaderContext.resource)
        .join('!')
    }
  })

  Object.defineProperty(loaderContext, 'remainingRequest', {
    get() {
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex + 1)
        .map(loader => loader.path)
        .concat(loaderContext.resource)
        .join('!')
    }
  })
  Object.defineProperty(loaderContext, 'currentRequest', {
    get() {
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex)
        .map(loader => loader.path)
        .concat(loaderContext.resource)
        .join('!')
    }
  })
  Object.defineProperty(loaderContext, 'previousRequest', {
    get() {
      return loaderContext.loaders
        .slice(0, loaderContext.loaderIndex)
        .map(loader => loader.path)
        .concat(loaderContext.resource)
        .join('!')
    }
  })
  Object.defineProperty(loaderContext, 'data', {
    get() {
      return loaderContext.loaders[loaderContext.loaderIndex]
    }
  })

  let processOptions = {
    resourceBuffer: null, // 本次要读取的资源文件Buffer
    readResource
  }

  // 迭代执行pitch
  iteratePitchingLoader(processOptions, loaderContext, (err, result) => {
    finalCallback && finalCallback(err, {
      result,
      resourceBuffer: processOptions.resourceBuffer
    })
  })
}

exports.runLoaders = runLoaders