/*****************************************************
通用插件合集:

Module name:usefulPugins.js
Author:悦来客栈的老板
Date:2022.12.22
Version:V1.5.1


欢迎加入本人的星球:


https://t.zsxq.com/FMRf2ZV

本人微信:523176585

*****************************************************/

const types = require("@babel/types");



//判断节点是否为字面量，插件地址 https://t.zsxq.com/09CvEE1FY
function isNodeLiteral(node) {
	if (Array.isArray(node)) {
		return node.every(ele => isNodeLiteral(ele));
	}
	if (types.isLiteral(node)) {
		if (node.value == null) {
			return false;
		}
		return true;
	}
	if (types.isBinaryExpression(node)) {
		return isNodeLiteral(node.left) && isNodeLiteral(node.right);
	}
	if (types.isUnaryExpression(node, {
		"operator": "-"
	}) || types.isUnaryExpression(node, {
		"operator": "+"
	})) {
		return isNodeLiteral(node.argument);
	}

	if (types.isObjectExpression(node)) {
		let { properties } = node;
		if (properties.length == 0) {
			return true;
		}

		return properties.every(property => isNodeLiteral(property));

	}
	if (types.isArrayExpression(node)) {
		let { elements } = node;
		if (elements.length == 0) {
			return true;
		}
		return elements.every(element => isNodeLiteral(element));
	}

	return false;
}




/******************************
变量分离,插件地址:

https://t.zsxq.com/09UTuS54o


处理前:
var a = 123,b = 456;
let c  = 789,d = 120;
处理后:
var a = 123;
var b = 456;
let c = 789;
let d = 120;
******************************/
const DeclaratorToDeclaration =
{
	VariableDeclaration(path) {
		let { parentPath, node } = path;
		if (!parentPath.isBlock()) {//过滤掉for..of...等语句
			return;
		}

		let { declarations, kind } = node;
		if (declarations.length == 1) {
			return;
		}

		let newNodes = [];

		for (const varNode of declarations) {
			let newDeclartionNode = types.VariableDeclaration(kind, [varNode]);
			newNodes.push(newDeclartionNode);
		}

		path.replaceWithMultiple(newNodes);

	},
}



/**************************************
变量定义为函数表达式合并为函数定义
var a = function ()
{
  console.log(666);
}

===>

function a() {
  console.log(666);
}
**************************************/
const varDeclarToFuncDeclar =
{
	VariableDeclarator(path) {
		let { node, parentPath, scope, container } = path;

		if (container.length != 1 ||
			!parentPath.parentPath.isBlock()) {//过滤掉for..of...等语句
			return;
		}

		let { id, init } = node;
		if (!types.isFunctionExpression(init, { id: null })) {
			return;
		}
		
		let { params, body } = init;
		let newNode = types.FunctionDeclaration(id, params, body);
		parentPath.replaceWith(newNode);
		scope.crawl();
	},
}

//规范For循环和While循环
const standardLoop =
{
	"ForStatement|WhileStatement"({ node }) {
		if (!types.isBlockStatement(node.body)) {
			node.body = types.BlockStatement([node.body]);
		}
	},
}


//去逗号表达式
const resolveSequence =
{
	SequenceExpression(path) {
		let { scope, parentPath, node } = path;
		let expressions = node.expressions;
		//如果是return 逗号表达式的话
		if (parentPath.isReturnStatement({ "argument": node })) {
			//拿出逗号的最后一个表达式
			let lastExpression = expressions.pop();
			//把前面的表达式放到前面去，return 最后一个
			for (let expression of expressions) {
				parentPath.insertBefore(types.ExpressionStatement(expression = expression));
			}
			
			path.replaceWith(lastExpression);
		}
		//如果前面没有return的话
		else if (parentPath.isExpressionStatement({ "expression": node })) {
			let body = [];
			expressions.forEach(express => { body.push(types.ExpressionStatement(express)); });
			path.replaceWithMultiple(body);
		}
		else {
			return;
		}
		//重构作用域 一般加一个没毛病
		scope.crawl();
	}
}

//常量折叠
const simplifyLiteral = {
	NumericLiteral({ node }) {
		if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
			node.extra = undefined;
		}
	},
	StringLiteral({ node }) {
		if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
			node.extra = undefined;
		}
	},
}



const constantFold = {
	"BinaryExpression|UnaryExpression"(path) {
		if (path.isBinaryExpression({ operator: "/" }) ||
			path.isUnaryExpression({ operator: "-" }) ||
			path.isUnaryExpression({ operator: "void" })) {
			return;
		}
		const { confident, value } = path.evaluate();
		if (!confident)
			return;
		if (typeof value == 'number' && (!Number.isFinite(value))) {
			return;
		}
		path.replaceWith(types.valueToNode(value));
	},
}





const keyToLiteral = {
	MemberExpression:
	{
		exit({ node }) {
			const prop = node.property;
			if (!node.computed && types.isIdentifier(prop)) {
				node.property = types.StringLiteral(prop.name);
				node.computed = true;
			}
		}
	},
	ObjectProperty:
	{
		exit({ node }) {
			const key = node.key;
			if (!node.computed && types.isIdentifier(key)) {
				node.key = types.StringLiteral(key.name);
			}
		}
	},
}



const preDecodeObject = {
	VariableDeclarator({ node, parentPath, scope }) {
		const { id, init } = node;
		if (!types.isObjectExpression(init)) return;
		let name = id.name;

		let properties = init.properties;
		let allNextSiblings = parentPath.getAllNextSiblings();
		for (let nextSibling of allNextSiblings) {
			if (!nextSibling.isExpressionStatement()) break;

			let expression = nextSibling.get('expression');
			if (!expression.isAssignmentExpression({ operator: "=" })) break;

			let { left, right } = expression.node;
			if (!types.isMemberExpression(left)) break;

			let { object, property } = left;
			if (!types.isIdentifier(object, { name: name }) ||
				!types.isStringLiteral(property)) {
				break;
			}

			properties.push(types.ObjectProperty(property, right));
			nextSibling.remove();
		}
		scope.crawl();
	},
}

const SimplifyIfStatement = {
	"IfStatement"(path) {
		const consequent = path.get("consequent");
		const alternate = path.get("alternate");
		const test = path.get("test");
		//判断条件真假
		const evaluateTest = test.evaluateTruthy();

		if (!consequent.isBlockStatement()) {
			consequent.replaceWith(types.BlockStatement([consequent.node]));
		}
		if (alternate.node !== null && !alternate.isBlockStatement()) {
			alternate.replaceWith(types.BlockStatement([alternate.node]));
		}
		
		//if体里面没有内容的话
		if (consequent.node.body.length == 0) {
			if (alternate.node == null) {
				path.replaceWith(test.node);
			}
			else {
				//存在else体 就把else体换到if体里面 并把条件取反
				consequent.replaceWith(alternate.node);
				alternate.remove();
				path.node.alternate = null;
				test.replaceWith(types.unaryExpression("!", test.node, true));
			}
		}
		//else体如果没有内容的话
		if (alternate.isBlockStatement() && alternate.node.body.length == 0) {
			alternate.remove();
			path.node.alternate = null;
		}

		if (evaluateTest === true) {
			path.replaceWithMultiple(consequent.node.body);
		}
		else if (evaluateTest === false) {
			alternate.node === null ? path.remove() : path.replaceWithMultiple(alternate.node.body);
		}
	},
}


const removeDeadCode = {
	"IfStatement|ConditionalExpression"(path) {
		let { consequent, alternate } = path.node;
		let testPath = path.get('test');
		const evaluateTest = testPath.evaluateTruthy();
		if (evaluateTest === true) {
			if (types.isBlockStatement(consequent)) {
				consequent = consequent.body;
			}
			path.replaceWithMultiple(consequent);
		}
		else if (evaluateTest === false) {
			if (alternate != null) {
				if (types.isBlockStatement(alternate)) {
					alternate = alternate.body;
				}
				path.replaceWithMultiple(alternate);
			}
			else {
				path.remove();
			}
		}
	},
	EmptyStatement(path) {
		path.remove();
	},
	"VariableDeclarator"(path) {
		let { node, scope, parentPath } = path;
		if (!parentPath.parentPath.isBlock()) {//过滤for..of等语句
			return;
		}
		let binding = scope.getBinding(node.id.name);

		if (!binding || binding.referenced) {
			return;
		}


		if (binding.constant) {//没有被引用，也没有被改变
			path.remove();
			return;
		}

		if (binding.constantViolations.length == 1 && binding.constantViolations[0] == path) {
			path.remove();
		}

	},
	FunctionDeclaration(path) {//删除函数定义中没有被使用的形式参数
		if (path.toString().includes("arguments")) {
			return;
		}

		let paramsPath = path.get('params');

		for (let eachPath of paramsPath) {
			let { node, scope } = eachPath;
			let binding = scope.getBinding(node.name);
			if (!binding.referenced && binding.constant) {
				eachPath.remove();
				scope.crawl();
			}
		}
	},
}


global.constantFold = constantFold;
global.keyToLiteral = keyToLiteral;
global.standardLoop = standardLoop;
global.isNodeLiteral = isNodeLiteral
global.removeDeadCode = removeDeadCode;
global.preDecodeObject = preDecodeObject;
global.simplifyLiteral = simplifyLiteral;
global.resolveSequence = resolveSequence;
global.SimplifyIfStatement = SimplifyIfStatement;
global.varDeclarToFuncDeclar = varDeclarToFuncDeclar;
global.DeclaratorToDeclaration = DeclaratorToDeclaration;

