function loader(source) {
  console.log('normal-loader2')
  return source
}

/**
 * 
 * @param {*} remainingRequest 当前loader前面执行过的loader
 * @param {*} precedingRequest 当前loader后面需要执行的loader
 * @param {*} data 
 */
loader.pitch = function(remainingRequest, precedingRequest, data) {
  console.log('normal-loader2 pitch');
}

module.exports = loader