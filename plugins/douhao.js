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
