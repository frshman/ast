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
    //var 替换
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
        {
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

    //赋值 替换
    AssignmentExpression(path)
	{
		let {scope,node,parentPath} = path;
		
		let {left,operator,right} = node;
		
		if (!types.isIdentifier(left) || operator != "=")
		{
			return;
		}
		
		if (types.isUnaryExpression(right) && ['+','-'].includes(right.operator))
		{
			if (!types.isLiteral(right.argument))
			{
				return;
			}
		}
		else if (types.isIdentifier(right))
		{//全局属性可以还原。
			if (typeof astglb[right.name] == 'undefined')
			{
				return;
			}
		}
		
		else if (types.isMemberExpression(right))
		{
			let name = right.object.name;
			if (typeof astglb[name] == 'undefined' || name == 'window')
			{//注意object为window时，可能会还原出错,所以需要先还原window
				return;
			}
		}
		
		else if (!types.isLiteral(right))
		{
			return;
		}
		
		let binding = scope.getBinding(left.name);
		
		if (!binding || binding.constantViolations.length != 1)
		{//赋值语句本身是改变了它，因此这里判断只有一处改变。
			return;
		}
		
		
		for (let referPath of binding.referencePaths)
		{
			referPath.replaceWith(right);
		}
		
		if(parentPath.isExpressionStatement() || parentPath.isSequenceExpression())
		{
			path.remove();
		}
	},

}

traverse(ast,restoreVarDeclarator);

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
fs.writeFile('decode.js', code, (err)=>{});
