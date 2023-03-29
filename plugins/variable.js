/**
 * 还原初始化为常量且始终未修改的变量
 */

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

let astglb = typeof window !='undefined' ? window : global;

const restoreVarDeclarator = {

    VariableDeclarator(path){
        let {node,scope} = path;
        let {id,init} = node;

        //es6语法的 id 类型 不是Identifier
        if(!types.isIdentifier(id) || init == null)
        {
            return;
        }
        
        let initPath = path.get("init");
        if(initPath.isUnaryExpression({operator:"+"}) || initPath.isUnaryExpression({operator:"-"}) )
        {

            if (!types.isLiteral(init.argument)){
                return;
            }
        
        }

        else if (initPath.isIdentifier())
        {//还原全局变量
            if (!typeof astglb[init.name] == 'undefined')
            {
                return;
            }
        }

        else if (initPath.isMemberExpression())
        {
            let name = init.object.name;
            if (typeof astglb[name] == 'undefined' || name == 'window')
            {
                return;
            }
        }
        
        else if (!initPath.isLiteral())
        {
            return;
        }

        const binding = scope.getBinding(id.name);

        if (!binding || !binding.constant) return;
            
        for (let referPath of binding.referencePaths)
        {   
            referPath.replaceWith(init);
        }

        path.remove();
    },

}

traverse(ast,restoreVarDeclarator);

let {code} = generator(ast);
console.log(code);
