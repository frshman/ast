const fs = require("fs")
const path = require('path');

let rootPath = path.resolve(__dirname, '..');

//把源代码解析成ast
const { parse } = require("@babel/parser");

//遍历节点
const traverse = require("@babel/traverse").default;

//节点的类型判断及构造等操作 主要是对节点进行替换，删除，增加等操作
const types = require("@babel/types");

//将处理完毕的AST转换成JavaScript源代码
const generator = require("@babel/generator").default;

let encode_file = `${__dirname}/encode.js`, decode_file = `${__dirname}/decode.js`;

if (process.argv.length > 2) {
    encode_file = process.argv[2];
    //   console.log(encode_file);
}
if (process.argv.length > 3) {
    decode_file = process.argv[3];
    //   console.log(decode_file);
}

let jscode = fs.readFileSync(encode_file, { encoding: "utf-8" });

//解析源码成ast(一个json格式的数据结构)
let ast = parse(jscode);
