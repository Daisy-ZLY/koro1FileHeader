/*
 * @Author: OBKoro1
 * @Github: https://github.com/OBKoro1
 * @Date: 2018-11-08 12:58:51
 * @LastEditors  : OBKoro1
 * @LastEditTime : 2021-05-18 15:05:45
 * @Description: 不同语言的逻辑
 */
const LanguageDifferent = require('./languageDifferent')
const vscode = require('vscode')
const handleError = require('../logic/handleError')
const global = require('../utile/CONST')
const util = require('../utile/util')

// 头部注释中间部分生成
const middleTpl = (data, fileEnd, config) => {
  let str = ''
  Object.keys(data).forEach((key) => {
    const obj = {
      fileEnd,
      type: 'topMiddle',
      key,
      value: newlineAddAnnotationFn(data[key], fileEnd, config)
    }
    const TplJudge = new LanguageDifferent(obj)
    str = str + TplJudge.res
  })
  return str
}

/**
 * @description: 文件头部注释生成
 * @param {Object} data 模板数据对象
 * @param {String} fileEnd 文件采用语言
 * @return: 字符串
 */
const headNotes = (data, fileEnd, config) => {
  try {
    const str = middleTpl(data, fileEnd, config)
    // 头部 中间模板 尾部合并
    const obj = {
      fileEnd,
      type: 'topHeadEnd',
      str
    }
    return new LanguageDifferent(obj).res
  } catch (err) {
    handleError.showErrorMessage('fileHeader: headerAnnotation', err)
  }
}

class FunctionTplStr {
  /**
   * @description: 函数注释模板生成
   * @param {Object} data 模板数据对象
   * @param {String} fileEnd 文件采用语言
   * @param {Number} lineSpace 每行前面的长度
   * @param {String} nextLine 当前行为空 不换行
   * @return: 函数注释的模板字符串
   */
  constructor (data, fileEnd, lineSpace, nextLine) {
    this.config = vscode.workspace.getConfiguration('fileheader')
    this.fileEnd = fileEnd
    this.nextLine = nextLine
    // 加上用户设置的长度
    lineSpace = lineSpace + this.config.configObj.functionBlankSpace
    this.str = ''.padStart(lineSpace) // 函数注释每行前面的空格
    this.strContent = '' // 中间模板部分的字符
    this.data = data
  }

  // 生成函数注释模板
  generate () {
    try {
      // 生成中间模板
      Object.keys(this.data).forEach((key) => {
        this.strContent += this.paramStr(key)
      })
      this.tpl = this.mergeStr()
      return util.replaceSymbolStr(this.tpl, this.fileEnd, 'fn')
    } catch (err) {
      handleError.showErrorMessage('fileHeader: headerAnnotation', err)
    }
  }

  /**
   * @param {String} key 数据对象的key
   */
  paramStr (key) {
    const obj = {
      isFunctionAnnotation: true, // 函数注释
      fileEnd: this.fileEnd,
      str: this.str,
      key,
      value: this.data[key]
    }
    obj.type = 'fnMiddle_key'
    // 注释是参数和返回值的话 多加一个参数的属性
    if (key.startsWith('param') || key.startsWith('return')) {
      obj.type = 'fnMiddle_param'
      obj.typeVal = '{*}'
      if (key.startsWith('param')) {
        return this.paramsHandle(obj)
      }
    }

    return new LanguageDifferent(obj).res
  }

  paramsShape (item) {
    const functionParamsShape = this.config.configObj.functionParamsShape
    if (functionParamsShape === 'no bracket') {
      // 不要方括号
      return `${item.type} ${item.param}`
    } else if (functionParamsShape === 'no type') {
      // 不要类型捕获
      return `${item.param}`
    } else {
      // 正常 都有
      return `{${item.type}} ${item.param}`
    }
  }

  // 合成参数
  paramsHandle (obj) {
    // 识别到参数
    const paramArr = this.data[obj.key]
    if (Array.isArray(paramArr)) {
      let params = ''
      paramArr.forEach((item) => {
        obj.typeVal = this.paramsShape(item)
        const str = new LanguageDifferent(obj).res
        params += str
      })
      return params
    }
    return new LanguageDifferent(obj).res
  }

  mergeStr () {
    const obj = {
      isFunctionAnnotation: true, // 函数注释
      fileEnd: this.fileEnd,
      strContent: this.strContent,
      str: this.str
    }
    if (this.nextLine === undefined) {
      // 当前行不为空
      obj.type = 'topHeadEnd_nextLineNo'
    } else {
      // 当前行为空
      obj.type = 'topHeadEnd_nextLineYes'
    }
    return new LanguageDifferent(obj).res
  }
}

/**
 * @description: 保存触发修改时的需要的字符输出
 * @param {String} fileEnd 文件语言
 */
class ChangeFont {
  constructor (fileEnd) {
    this.fileEnd = fileEnd
  }

  // 输出注释开头：用以判断是否进入注释
  star () {
    const obj = {
      fileEnd: this.fileEnd,
      type: 'annotationStarts'
    }
    return new LanguageDifferent(obj).res
  }

  // 最后编辑人
  LastEditorsStr (LastEditors) {
    const obj = {
      fileEnd: this.fileEnd,
      type: 'LastEditorsStr',
      LastEditors
    }
    return new LanguageDifferent(obj).res
  }

  // 最后编辑时间
  lastTimeStr () {
    const obj = {
      fileEnd: this.fileEnd,
      type: 'lastTimeStr'
    }
    return new LanguageDifferent(obj).res
  }
}

// 换行符加注释符号
function newlineAddAnnotationFn (value, fileEnd, config) {
  if (config.configObj.switch.newlineAddAnnotation) {
    let middle = null
    // 匹配用户定义语言符号
    if (fileEnd.userLanguage) {
      middle = config.configObj.language[fileEnd.fileEnd].middle
    } else if (fileEnd !== global.NoMatchLanguage) {
      // 匹配插件的符号
      middle = global.annotationSymbol[fileEnd].middle
    } else if (config.configObj.annotationStr.use) {
      // 调用用户设置的默认注释符号
      middle = config.configObj.language.middle
    } else {
      // 插件默认设置
      middle = global.annotationSymbol.javascript.middle
    }
    if (middle !== null) {
      // \n 换行
      // \r 回车
      // \r\n Windows系统里面，每行结尾是“<回车><换行>”
      // eslint-disable-next-line no-useless-escape
      value = value.replace(/\r\n/g, `\obkoro1\obkoro1${middle}`) // 转化为特殊字符 不影响下面的替换
      value = value.replace(/\n/g, `\n${middle}`)
      value = value.replace(/\r/g, `\r${middle}`)
      // eslint-disable-next-line no-useless-escape
      value = value.replace(/\obkoro1\obkoro1/g, '\r\n') // 转化回来
    }
  }
  return value
}

module.exports = {
  headNotes,
  FunctionTplStr,
  ChangeFont,
  middleTpl
}
