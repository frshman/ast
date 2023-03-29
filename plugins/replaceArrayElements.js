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
let ast = parse(jscode);

const replaceArrayElements = {
    VariableDeclarator(path)
    {
        let {node,scope} = path;
        let {id,init} = node;
        if (!types.isArrayExpression(init) || init.elements.length == 0) return;

        const binding = scope.getBinding(id.name);
        if (!binding || !binding.constant) return;

        for (let referPath of binding.referencePaths) {
			let { node, parent } = referPath;
			if (!types.isMemberExpression(parent, { object: node }) || !types.isNumericLiteral(parent.property)) {
				return;
			};
		}   
        
        for (let referPath of binding.referencePaths)
        {
            let {parent,parentPath} = referPath;
            let index = parent.property.value;
            parentPath.replaceWith(init.elements[index]);
        }
        
        path.remove()
    },

}

traverse(ast,replaceArrayElements);

let {code} = generator(ast);
console.log(code);