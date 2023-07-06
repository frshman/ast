
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

traverse(ast, ConditionToIf);

