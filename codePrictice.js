const fs = require('fs');
const types = require("@babel/types");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generator = require("@babel/generator").default;

//js混淆代码读取
process.argv.length > 2 ? encodeFile = process.argv[2] : encodeFile = `${__dirname}/encode.js`;
process.argv.length > 3 ? decodeFile = process.argv[3] : decodeFile = `${__dirname}/decode.js`;

//将源代码解析为AST
let sourceCode = fs.readFileSync(encodeFile, {encoding: "utf-8"});

let ast = parser.parse(sourceCode);


console.time("处理完毕，耗时");

function WhilecollectSwitchCase(Path, name) {
    let ifNodes = [];

    Path.traverse({
        "IfStatement"(path) {//遍历所有的ifStatement;
            let {test, consequent, alternate} = path.node; //获取子节点

            let {left, operator, right} = test; // 必定是BinaryExpression

            if (!types.isIdentifier(left, {name: name}) || operator != '===' || !types.isNumericLiteral(right)) {//条件过滤
                return;
            }

            let value = right.value;

            ifNodes[right.value] = consequent.body;   //保存整个body，记得生成switchCase节点的时候加上break节点。

            if (!types.isIfStatement(alternate)) {
                ifNodes[right.value + 1] = alternate.body;  //最后一个else，其实就是上一个else-if 的 test.right的值
            }
        },
    })

    return ifNodes;
}

function ForcollectSwitchCase(Path, name) {
    let ifNodes = [];

    Path.traverse({
        "IfStatement"(path) {//遍历所有的ifStatement;
            let {test, consequent, alternate} = path.node; //获取子节点

            if (!types.isBlockStatement(consequent)) {
                return;
            }

            for (let x of consequent.body) {
                if (types.isIfStatement(x) && x.test.operator == '<=') {
                    return;
                }
            }

            let {left, operator, right} = test; // 必定是BinaryExpression

            if (!types.isIdentifier(left, {name: name}) || operator != '<=' || !types.isNumericLiteral(right)) {//条件过滤
                return;
            }

            let value = right.value;

            ifNodes[right.value] = consequent.body;   //保存整个body，记得生成switchCase节点的时候加上break节点。

            if (!alternate.body) return;
            for (let y of alternate.body) {
                if (types.isIfStatement(y) && y.test.operator == '<=') {
                    return;
                }
            }

            ifNodes[right.value + 1] = alternate.body;  //最后一个else，其实就是上一个else-if 的 test.right的
        },
    })
    return ifNodes;
}


const SimplifyIfStatement = {
    "IfStatement"(path) {
        const consequent = path.get("consequent");
        const alternate = path.get("alternate");
        const test = path.get("test");
        const evaluateTest = test.evaluateTruthy();

        if (!consequent.isBlockStatement()) {
            consequent.replaceWith(types.BlockStatement([consequent.node]));
        }
        if (alternate.node !== null && !alternate.isBlockStatement()) {
            alternate.replaceWith(types.BlockStatement([alternate.node]));
        }

        if (consequent.node.body.length == 0) {
            if (alternate.node == null) {
                path.replaceWith(test.node);
            } else {
                consequent.replaceWith(alternate.node);
                alternate.remove();
                path.node.alternate = null;
                test.replaceWith(types.unaryExpression("!", test.node, true));
            }
        }

        if (alternate.isBlockStatement() && alternate.node.body.length == 0) {
            alternate.remove();
            path.node.alternate = null;
        }

        if (evaluateTest === true) {
            path.replaceWithMultiple(consequent.node.body);
        } else if (evaluateTest === false) {
            alternate.node === null ? path.remove() : path.replaceWithMultiple(alternate.node.body);
        }
    },
}

traverse(ast, SimplifyIfStatement);

const WhileIfToSwitchNode = {
    "WhileStatement"(path) {
        let {test, body} = path.node;

        if (!types.isNumericLiteral(test, {value: 1}) || body.body.length != 2) {//条件过滤
            return;
        }

        let blockBody = body.body;

        if (!types.isExpressionStatement(blockBody[0]) || !types.isIfStatement(blockBody[1])) {//条件过滤
            return;
        }

        let {left, right} = blockBody[0].expression; //或者左右节点  _$nE = _$Lc[_$nI++];

        let name = left.name;   //变量名

        let ifNodes = WhilecollectSwitchCase(path, name);   //收集case

        if (ifNodes.length == 0) return;   //无case，直接返回。

        let len = ifNodes.length;

        for (let i = 0; i < len; i++) {
            ifNodes[i].push(types.BreakStatement());  //每一个case最后都加break
            ifNodes[i] = types.SwitchCase(test = types.valueToNode(i + 1), consequent = ifNodes[i]);  //生成SwitchCase节点
        }

        let switchNode = types.SwitchStatement(right, ifNodes);   //生成SwitchCase节点

        path.node.body.body = [switchNode]; //最后的while节点只有一个Switch Node;

    },
}

const ForIfToSwitchNode = {
    "ForStatement"(path) {
        let {body} = path.node;

        if (!body.body || body.body.length != 2) {//条件过滤
            return;
        }

        let blockBody = body.body;

        if (!types.isExpressionStatement(blockBody[0]) || !types.isIfStatement(blockBody[1]) || !types.isBinaryExpression(blockBody[1].test) || !blockBody[1].test.right.value == 63) {//条件过滤
            return;
        }

        let {left, right} = blockBody[0].expression; //或者左右节点  _$nE = _$Lc[_$nI++];

        let name = left.name;   //变量名

        let ifNodes = ForcollectSwitchCase(path, name);   //收集case

        if (ifNodes.length == 0) return;   //无case，直接返回。

        let len = ifNodes.length;

        for (let i = 0; i < len; i++) {
            ifNodes[i].push(types.BreakStatement());  //每一个case最后都加break
            ifNodes[i] = types.SwitchCase(test = types.valueToNode(i + 1), consequent = ifNodes[i]);  //生成SwitchCase节点
        }

        let switchNode = types.SwitchStatement(right, ifNodes);   //生成SwitchCase节点

        path.node.body.body = [switchNode]; //最后的while节点只有一个Switch Node;

    },
}

traverse(ast, ForIfToSwitchNode);

console.timeEnd("处理完毕，耗时");


let {code} = generator(ast, opts = {jsescOption: {"minimal": true}});

fs.writeFile(decodeFile, code, (err) => {
});