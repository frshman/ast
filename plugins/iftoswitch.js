function WhilecollectSwitchCase(Path, name) {
    let ifNodes = [];

    Path.traverse({
        "IfStatement"(path) {//遍历所有的ifStatement;
            let { test, consequent, alternate } = path.node; //获取子节点

            let { left, operator, right } = test; // 必定是BinaryExpression

            if (!types.isIdentifier(left, { name: name }) || operator != '===' || !types.isNumericLiteral(right)) {//条件过滤
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
            let { test, consequent, alternate } = path.node; //获取子节点

            if (!types.isBlockStatement(consequent) || types.isIfStatement(consequent.body[0])) { return; }

            let { left, operator, right } = test; // 必定是BinaryExpression

            if (!types.isIdentifier(left, { name: name }) || operator != '<=' || !types.isNumericLiteral(right)) {//条件过滤
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

const WhileIfToSwitchNode = {
    "WhileStatement"(path) {
        let { test, body } = path.node;

        if (!types.isNumericLiteral(test, { value: 1 }) || body.body.length != 2) {//条件过滤
            return;
        }

        let blockBody = body.body;

        if (!types.isExpressionStatement(blockBody[0]) || !types.isIfStatement(blockBody[1])) {//条件过滤
            return;
        }

        let { left, right } = blockBody[0].expression; //或者左右节点  _$nE = _$Lc[_$nI++];

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
        let { body } = path.node;

        if (!body.body || body.body.length != 2) {//条件过滤
            return;
        }

        let blockBody = body.body;

        if (!types.isExpressionStatement(blockBody[0]) || !types.isIfStatement(blockBody[1]) || !types.isBinaryExpression(blockBody[1].test) || !blockBody[1].test.right.value == 63) {//条件过滤
            return;
        }

        let { left, right } = blockBody[0].expression; //或者左右节点  _$nE = _$Lc[_$nI++];

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
traverse(ast, WhileIfToSwitchNode);