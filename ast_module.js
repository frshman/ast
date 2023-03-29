const fs = require("fs")
//把源代码解析成ast
const {parse} = require("@babel/parser");

//遍历节点
const traverse = require("@babel/traverse").default;

//节点的类型判断及构造等操作 主要是对节点进行替换，删除，增加等操作
const types = require("@babel/types");

//将处理完毕的AST转换成JavaScript源代码
const generator = require("@babel/generator").default;

let encode_file = "./encode.js",decode_file = "./decode_result.js";

if (process.argv.length > 2)
{
  encode_file = process.argv[2];
//   console.log(encode_file);
}
if (process.argv.length > 3)
{
  decode_file = process.argv[3];
//   console.log(decode_file);
}


let jscode = fs.readFileSync(encode_file, {encoding: "utf-8"});

//解析源码成ast(一个json格式的数据结构)
let ast = parse(jscode);

//null可能是代表所有的都转字符串
// console.log(JSON.stringify(ast,null,'\t'));

//============================
//针对ast做一系列的操作

let window = typeof window !='undefined' ? window : global;

const visitor = 
{
    
  //TODO  write your code here！
}


//some function code



//调用插件，处理源代码
traverse(ast,visitor);


//============================

//还原之后的code
let {code} = generator(ast);

//将将最终的code结果保持为新的js文件
fs.writeFile('decode.js', code, (err)=>{});