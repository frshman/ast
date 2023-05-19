/*****************************************************
Module name:decode_obfuscator.js
Author:悦来客栈的老板
Date:2022.12.22
Version:V2.0.7

混淆工具地址:https://obfuscator.io/

脚本仅用于被obfuscator混淆了的代码，不支持商业工具混淆的代码

声明:

脚本仅用于学习研究，禁止非法使用，否则后果自负！


使用方法可以观看在线视频:

https://www.bilibili.com/video/BV16V411H7yz

欢迎购买AST星球共同学习交流

星球地址:

https://t.zsxq.com/FMRf2ZV

本人微信:523176585

*****************************************************/

const fs = require('fs');
const types = require("@babel/types");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;
const usefulPlugins = require("./tools/usefulPlugins");


//js混淆代码读取
process.argv.length > 2 ? encodeFile = process.argv[2] : encodeFile = `${__dirname}/input/encode.js`;
process.argv.length > 3 ? decodeFile = process.argv[3] : decodeFile = `${__dirname}/output/decodeResult.js`;

//将源代码解析为AST
let sourceCode = fs.readFileSync(encodeFile, { encoding: "utf-8" });

let ast = parser.parse(sourceCode);


console.time("处理完毕，耗时");


//字面量解混淆
console.log("traverse Hex or Unicode String.......");

traverse(ast, simplifyLiteral);

//常量折叠
console.log("constantFold.......");

traverse(ast, constantFold);

//if表达式的优化
traverse(ast, SimplifyIfStatement);

//给循环体加上{}
traverse(ast, standardLoop);


//去逗号表达式
console.log("resolve Sequence.......");

traverse(ast, resolveSequence);

//变量定义的分离
console.log("Simpliy VariableDeclaration......");
traverse(ast, DeclaratorToDeclaration);

//变量定义转函数定义
console.log("VariableDeclaration To FuncDeclaration......");
traverse(ast, varDeclarToFuncDeclar);


function isObfuscatorCode(path) {//判断是否为ob混淆的特征，对于变种的ob代码，可以更改此代码

	let { parentPath, node } = path;
	let { id, body } = node;
	if (body.body.length != 3) {
		return false;
	}
	//函数体分成三个节点
	let [firstNode, secondNode, thirdNode] = body.body;
	//判断第一部分是否为 变量声明 第二部分是否为表达式 第三部分是否为return
	if (!types.isVariableDeclaration(firstNode) ||
		!types.isExpressionStatement(secondNode) ||
		!types.isReturnStatement(thirdNode)) {
		return false;
	}
	//第一部分详细判断 第一个变量是否为一个数组   并且长度不能为0 每个元素不能都是字符串
	let { init } = firstNode.declarations[0];
	if (!types.isArrayExpression(init) || init.elements.length == 0 ||
		!init.elements.every(element => types.isStringLiteral(element))) {
		return false;
	}

	//第二部分详细判断 是一个 = 表达式  并且标识符和该函数相同
	if (!types.isAssignmentExpression(secondNode.expression) || !types.isIdentifier(secondNode.expression.left, { "name": id.name })) {
		return false;
	}

	//对整体函数的引用 和 常量变化判断
	let scope = parentPath.scope;
	let binding = scope.getBinding(id.name);
	if (!binding || binding.referencePaths.length != 3 ||
		binding.constantViolations.length != 1) {
		return false;
	}

	return true;
}


function getReDefineFunction(scope, funcNames) {
	let decodeCode = "";
	scope.traverse(scope.block, {
		"FunctionDeclaration"(path) {
			let { id, body, params } = path.node;
			if (params.length != 4 && params.length != 5) {//重复定义的函数，其形参长度全部是5(如果是其他长度，需要更改)，这也是ob混淆的特征
				return;
			}
			body = body.body;
			if (!body || body.length != 1 ||
				!types.isReturnStatement(body[0])) {
				return;
			}
			let argument = body[0].argument;
			if (!types.isCallExpression(argument) ||
				!types.isIdentifier(argument.callee)) {
				return;
			}
			decodeCode += path.toString();
			funcNames.push(id.name);
			path.remove();
		},
	})
	return decodeCode;
}


const CallExpressToLiteral =
{
	FunctionDeclaration(path) {
		if (!isObfuscatorCode(path)) return;//如果不是ob混淆的代码，直接退出

		let { parentPath, node } = path;
		let scope = parentPath.scope;
		let binding = scope.getBinding(node.id.name);

		let obfuscatorPaths = [path], funcNames = [];
		let decodePath = "";

		for (let referPath of binding.referencePaths) {
			if (path.isAncestor(referPath)) {
				continue;
			}
			let { parentPath, node } = referPath;

			if (!parentPath.isCallExpression()) return;  //引用的地方都是 CallExpression

			let funcPath = parentPath.findParent(p => p.isFunctionDeclaration());//找 FunctionDeclaration父节点，即解密函数
			if (!funcPath) {
				funcPath = parentPath.findParent(p => p.isExpressionStatement());//找 ExpressionStatement 父节点，即移位函数
				if (!funcPath) return;
			}
			else {
				funcNames.push(funcPath.node.id.name);
				decodePath = funcPath;
			}

			obfuscatorPaths.push(funcPath);
		}

		let obfuscatorCode = "";
		obfuscatorPaths.forEach(eachPath => { obfuscatorCode += eachPath.toString() });
		obfuscatorCode += getReDefineFunction(scope, funcNames);

		let funcAst = parser.parse(obfuscatorCode);
		obfuscatorCode = generator(funcAst, opts = { "compact": true }).code;

		require = undefined; //防止恶意格盘
		eval(obfuscatorCode);

		let canRemoved = true;

		scope.traverse(scope.block, {
			"CallExpression"(path) {

				let node = path.node;

				let { callee, arguments } = node;
				if (!funcNames.includes(callee.name) ||
					decodePath.isAncestor(path)) {
					return;
				}

				if (!isNodeLiteral(arguments)) {
					canRemoved = false;
					return;
				}

				let value = eval(path.toString());
				console.log(path.toString(), "-->", value);
				path.replaceWith(types.valueToNode(value));
			},
		});

		if (canRemoved) {
			obfuscatorPaths.forEach(eachPath => { eachPath.remove(); });
		}
	},
}


traverse(ast, CallExpressToLiteral);

console.log("constantFold.......");

traverse(ast, constantFold);

//object key值Literal
console.log("Object Preconditioning .......");

traverse(ast, keyToLiteral);

traverse(ast, preDecodeObject);

//处理object

console.log("Object Decode .......");


function savePropertiesToObject(properties, newMap) {
	for (const property of properties) {
		if (!property.key) {
			break;
		}
		let propKey = property.key.value;
		let propValue = property.value;
		if (types.isStringLiteral(propValue)) {
			newMap.set(propKey, propValue);
		}
		else if (types.isFunctionExpression(propValue)) {
			let retState = propValue.body.body;
			if (retState.length == 1 && types.isReturnStatement(retState[0])) {
				let argument = retState[0].argument;
				if (types.isCallExpression(argument)) {
					newMap.set(propKey, "Call");
				}
				else if (types.isBinaryExpression(argument) ||
					types.isLogicalExpression(argument)) {
					newMap.set(propKey, argument.operator);
				}
			}
		}
		else {
			break;
		}
	}
}




const decodeObject = {
	VariableDeclarator({ node, scope }) {
		const { id, init } = node;
		if (!types.isObjectExpression(init)) return;
		let name = id.name;



		let binding = scope.getBinding(name);
		let { constant, referencePaths } = binding;
		if (!constant) return;

		let properties = init.properties;
		if (properties.length == 0) return;

		let newMap = new Map();
		savePropertiesToObject(properties, newMap);
		if (newMap.size != properties.length) return;



		for (const referPath of referencePaths.reverse()) {
			let { node, parent, parentPath } = referPath;
			let ancestorPath = parentPath.parentPath;
			if (!parentPath.isMemberExpression({ object: node })) {
				continue;
			}
			let { property } = parent;
			let propKey = property.value;
			let propValue = newMap.get(propKey);
			if (!propValue) {
				continue;
			}

			if (typeof propValue != "string") {
				parentPath.replaceWith(propValue);
				continue;
			}
			if (ancestorPath.isCallExpression({ callee: parent })) {
				let { arguments } = ancestorPath.node;
				switch (propValue) {
					case "Call":
						ancestorPath.replaceWith(types.CallExpression(arguments[0], arguments.slice(1)));
						break;
					case "||":
					case "&&":
						ancestorPath.replaceWith(types.LogicalExpression(propValue, arguments[0], arguments[1]));
						break;
					default:
						ancestorPath.replaceWith(types.BinaryExpression(propValue, arguments[0], arguments[1]));
						break;
				}
			}
		}

		newMap.clear();

		scope.crawl();

	},
}

traverse(ast, decodeObject);


console.log("Control Flow Decoding.......\n");

//去控制流
const decodeControlFlow = {

	WhileStatement(path) {
		const { node, scope } = path;
		const { test, body } = node;
		if (!types.isLiteral(test, { value: true })) return;
		if (body.body.length != 2) return;
		let switchNode = body.body[0], breakNode = body.body[1];
		if (!types.isSwitchStatement(switchNode) ||
			!types.isBreakStatement(breakNode)) {
			return;
		}
		let { discriminant, cases } = switchNode;
		if (!types.isMemberExpression(discriminant)) return;
		let { object, property } = discriminant;
		if (!types.isIdentifier(object) || !types.isUpdateExpression(property)) return;

		let arrName = object.name;
		let binding = scope.getBinding(arrName);
		if (!binding || !binding.path || !binding.path.isVariableDeclarator()) return;
		let { id, init } = binding.path.node;
		if (!types.isCallExpression(init) || !types.isMemberExpression(init.callee)) return;
		object = init.callee.object;
		property = init.callee.property;
		if (!types.isStringLiteral(object) || !types.isStringLiteral(property, { value: "split" })) {
			return;
		}

		let disPatchArray = object.value.split("|");
		let retBody = [];
		disPatchArray.forEach(index => {
			let caseBody = cases[index].consequent;
			if (types.isContinueStatement(caseBody[caseBody.length - 1])) {
				caseBody.pop();
			}
			retBody = retBody.concat(caseBody);
		})

		path.replaceWithMultiple(retBody);
	},
}

traverse(ast, decodeControlFlow);


console.log("constantFold.......");

traverse(ast, constantFold);


ast = parser.parse(generator(ast, opts = { jsescOption: { "minimal": true } }).code);

console.log("remove Dead Code.......\n");

traverse(ast, removeDeadCode);


const deleteObfuscatorCode =
{
	VariableDeclarator(path) {
		let sourceCode = path.toString();
		let { id, init } = path.node;
		if (types.isCallExpression(init)) {
			let { callee, arguments } = init;
			if (arguments.length == 0 && sourceCode.includes("apply")) {
				path.remove();
			}
			else if ((sourceCode.includes("constructor") || sourceCode.includes("RegExp")) &&
				types.isIdentifier(callee) && arguments.length == 2 &&
				types.isThisExpression(arguments[0]) &&
				types.isFunctionExpression(arguments[1])) {
				let funcName = id.name;

				let nextSibling = path.parentPath.getNextSibling();
				if (nextSibling.isExpressionStatement()) {
					let expression = nextSibling.get("expression");

					if (expression.isCallExpression() && expression.get("callee").isIdentifier({ name: funcName })) {
						path.remove();
						nextSibling.remove();
					}
				}
			}
		}
	},
	ExpressionStatement(path) {

		let { expression } = path.node;
		if (!types.isCallExpression(expression)) {
			return;
		}
		let { callee, arguments } = expression;

		if (!types.isFunctionExpression(callee) || arguments.length != 0) {
			return;
		}

		let sourceCode = path.toString();
		if ((sourceCode.includes("RegExp") && sourceCode.includes("chain")) ||
			(sourceCode.includes("constructor") && sourceCode.includes("setInterval"))) {
			path.remove();
		}
	},
	CallExpression(path) {
		let { scope, node } = path;
		let { callee, arguments } = node;
		if (!types.isIdentifier(callee, { name: "setInterval" })) {
			return;
		}
		if (arguments.length != 2 || !types.isFunctionExpression(arguments[0]) ||
			!types.isNumericLiteral(arguments[1])) {
			return;
		}

		let body = arguments[0].body.body;
		if (body.length != 1 || !types.isExpressionStatement(body[0])) {
			return;
		}
		expression = body[0].expression;
		if (!types.isCallExpression(expression)) {
			return;
		}
		callee = expression.callee;
		arguments = expression.arguments;

		if (!types.isIdentifier(callee) || arguments.length != 0) {
			return;
		}

		let binding = scope.getBinding(callee.name);
		if (!binding || !binding.path) {
			return;
		}

		let sourceCode = binding.path.toString();
		if (sourceCode.includes("constructor") ||
			sourceCode.includes("debugger")) {
			path.remove();
			binding.path.remove();
		}
	},
	FunctionDeclaration(path) {
		let { body } = path.node.body;
		if (body.length == 2 && types.isFunctionDeclaration(body[0]) &&
			types.isTryStatement(body[1])) {
			let sourceCode = path.toString();
			if (sourceCode.includes("constructor") &&
				sourceCode.includes("debugger") &&
				sourceCode.includes("apply")) {
				path.remove();
			}
		}
	},
}

traverse(ast, deleteObfuscatorCode);



console.timeEnd("处理完毕，耗时");


let { code } = generator(ast, opts = { jsescOption: { "minimal": true } });

fs.writeFile(decodeFile, code, (err) => { });