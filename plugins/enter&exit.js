
//把源代码解析成ast
const {parse} = require("@babel/parser");

//遍历节点
const traverse = require("@babel/traverse").default;

//节点的类型判断及构造等操作 主要是对节点进行替换，删除，增加等操作
const types = require("@babel/types");

//将处理完毕的AST转换成JavaScript源代码
const generator = require("@babel/generator").default;


let sourceCode = "var a = 'a' + 'b' + 'c' + d + 'e' + 'f';";
let ast    = parse(sourceCode);

const visitor = {
    "BinaryExpression": {
        enter: function(path) {
            console.log(path.toString())
            const {confident, value} = path.evaluate();
            confident && path.replaceWith(types.valueToNode(value));
        }
    },
}

traverse(ast, visitor);
console.log(generator(ast))