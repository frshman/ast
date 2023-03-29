const fs = require('fs');
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const generator = require("@babel/generator").default;

let encode_file = "./encode.js",decode_file = "./decode_result.js";

let jscode = fs.readFileSync(encode_file, {encoding: "utf-8"});

let ast = parse(jscode);


const ConditionToIf = {
	ConditionalExpression: {
		exit(path){
			let {test, consequent, alternate} = path.node;
			if (types.isSequenceExpression(consequent))
			{
				let expressions = consequent.expressions;
				let retBody = [];
				for(let expression of expressions)
				{
					retBody.push(types.ExpressionStatement(expression));
				}
				consequent = types.BlockStatement(retBody);
			}
			else
			{
				consequent = types.ExpressionStatement(consequent);
				consequent = types.BlockStatement([consequent]);
			}
			if (types.isSequenceExpression(alternate))
			{
				let expressions = alternate.expressions;
				let retBody = [];
				for(let expression of expressions)
				{
					retBody.push(types.ExpressionStatement(expression));
				}
				alternate = types.BlockStatement(retBody);
			}
			else
			{
				alternate = types.ExpressionStatement(alternate);
				alternate = types.BlockStatement([alternate]);
			}
			let ifStateNode = types.IfStatement(test,consequent,alternate);
			path.replaceWithMultiple(ifStateNode);
			path.skip();
  }
 },
}

// const resolveSequenceForLogicalExpression = 
// {
// 	IfStatement(path)
// 	{
// 		let {test} = path.node;
// 		if (!types.isLogicalExpression(test))
// 		{
// 			return;
// 		}
// 		let {left,operator,right} = test;
// 		if (types.isSequenceExpression(left))
// 		{
// 			let {expressions} = left;
// 			let lastNode = expressions.pop();
// 			for (let expression of expressions)
// 			{
// 				path.insertBefore(types.ExpressionStatement(expression=expression));
// 			}
// 			path.node.test.left = lastNode;
// 		}
		
// 		if (operator == "&&" && types.isSequenceExpression(right))
// 		{
// 			let {expressions} = right;
// 			let lastNode = expressions.pop();
// 			let ifBody = [];
// 			for (let expression of expressions)
// 			{
// 				ifBody.push(types.ExpressionStatement(expression=expression));
// 			}
// 			path.node.test.right = lastNode;
// 			let ifNode = types.IfStatement(path.node.test.left,types.BlockStatement(ifBody),null);
// 			path.insertBefore(ifNode);
// 		}
// 	}
// }

traverse(ast, ConditionToIf);
// traverse(ast, resolveSequenceForLogicalExpression);

let { code } = generator(ast);
fs.writeFile('decode.js', code, (err)=>{});