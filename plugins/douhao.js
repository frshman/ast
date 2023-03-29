 /************************************************************************

3 === this.Cn ? this.Yz = 256 : 23 === this.Cn ? this.$V ? this.Yz = 480 : this.Yz = 512 : this.$V ? this.Yz = 960 : this.Yz = 1024;

===>

if (3 === this.Cn) {
  this.Yz = 256;
} else {
  if (23 === this.Cn) {
    if (this.$V) {
      this.Yz = 480;
    } else {
      this.Yz = 512;
    }
  } else {
    if (this.$V) {
      this.Yz = 960;
    } else {
      this.Yz = 1024;
    }
  }
}

************************************************************************/

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

// if (process.argv.length > 2)
// {
//   encode_file = process.argv[2];
// //   console.log(encode_file);
// }
// if (process.argv.length > 3)
// {
//   decode_file = process.argv[3];
// //   console.log(decode_file);
// }

let jscode = fs.readFileSync(encode_file, {encoding: "utf-8"});

//解析源码成ast(一个json格式的数据结构)
let ast = parse(jscode);

//null可能是代表所有的都转字符串
// console.log(JSON.stringify(ast,null,'\t'));

//============================
//针对ast做一系列的操作


function SequenceOfStatement(path)
{
	let {scope,parentPath,node} = path;
	let expressions = node.expressions;
	if (parentPath.isReturnStatement({"argument":node}))
	{
			parentPath.node.argument = expressions.pop();
	}
	else if(parentPath.isIfStatement({"test":node}) || 
		      parentPath.isWhileStatement({"test":node}))
	{
			parentPath.node.test  = expressions.pop();
	}
	else if(parentPath.isForStatement({"init":node}))
	{
			parentPath.node.init  = expressions.pop();
	}
	else if(parentPath.isSwitchStatement({"discriminant":node}))
	{
			parentPath.node.discriminant  = expressions.pop();
	}
	else if(parentPath.isExpressionStatement({"expression":node}))
	{
			parentPath.node.expression  = expressions.pop();
	}
	else
	{
		return;
	}
	for (let expression of expressions)
	{
		parentPath.insertBefore(types.ExpressionStatement(expression=expression));
	}
	
	scope.crawl(); // 遍历某些大文件时可能比较慢。
}


function SequenceOfExpression(path)
{

	let {scope,parentPath,node,parent} = path;
	let ancestorPath = parentPath.parentPath;
	let expressions = node.expressions;
	if(parentPath.isConditionalExpression({"test":node}) && 
		 ancestorPath.isExpressionStatement({"expression":parent}))
	{
			parentPath.node.test  = expressions.pop();
	}
	else if (parentPath.isVariableDeclarator({"init":node}) &&
	    ancestorPath.parentPath.isBlock())
	{
		parentPath.node.init  = expressions.pop();
	}
	else if (parentPath.isAssignmentExpression({"right":node}) &&
	         ancestorPath.isExpressionStatement({"expression":parent}))
	{
		parentPath.node.right  = expressions.pop();
	}	
	else
	{
		return;
	}
	
	for (let expression of expressions)
	{
		ancestorPath.insertBefore(types.ExpressionStatement(expression=expression));
	}
	
	scope.crawl(); // 遍历某些大文件时可能比较慢	
	
	
}



const resolveSequence = 
{
	SequenceExpression:
	{//对同一节点遍历多个方法
		enter:[SequenceOfStatement,SequenceOfExpression]
	}
}


traverse(ast, resolveSequence);
//还原之后的code
let {code} = generator(ast);

//将将最终的code结果保持为新的js文件
fs.writeFile('decode.js', code, (err)=>{});
