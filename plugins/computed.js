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

let jscode = fs.readFileSync(encode_file, {encoding: "utf-8"});

//解析源码成ast(一个json格式的数据结构)
let ast = parse("1+2;");

const constantFold = {
    "BinaryExpression|UnaryExpression"(path){
        if(path.isUnaryExpression({operator:"-"}) || path.isUnaryExpression({operator:"void"}))
        {
            return;
        }

        const {confident,value} = path.evaluate();
        if (!confident)return;
        if (typeof value == 'number' && (!Number.isFinite(value))){
            return;
        }   
        path.replaceWith(types.valueToNode(value));
    },

}

traverse(ast,constantFold);

let {code} = generator(ast);
console.log(code);