 const display = document.getElementById("display");
    const expressionDisplay = document.getElementById("expression");
    const clearButton = document.getElementById("clearButton");

    let entry = "0";

    let accumulator = null;
    let pendingOperator = null;

    let waitingForOperand = false;
    let justEvaluated = false;
    let errorState = false;

    let lastOperator = null;
    let lastOperand = null;

    let completedExpression = "";
    let liveExpression = "0";

    const THIN_SPACE = "\u2009";

    function formatNumber(number) {
        if (!Number.isFinite(number)) {
            return "Error";
        }

        if (Object.is(number, -0)) {
            number = 0;
        }

        return Number.parseFloat(number.toPrecision(12)).toString();
    }

    function formatLiveExpression(first, operator, second = null) {
        if (second === null) {
            return `${formatNumber(first)}${THIN_SPACE}${operator}`;
        }

        return `${formatNumber(first)}${THIN_SPACE}${operator}${THIN_SPACE}${second}`;
    }

    function updateDisplay() {
        display.textContent = liveExpression;
        expressionDisplay.textContent = completedExpression;

        clearButton.textContent =
            entry === "0" && pendingOperator === null
                ? "AC"
                : "C";

        // Dynamically shrink long expressions.
        const length = liveExpression.length;

        let fontSize = 64;

        if (length > 9) {
            fontSize = Math.max(30, 64 - (length - 9) * 3);
        }

        display.style.fontSize = `${fontSize}px`;
    }

    function updateSelectedOperator() {
        document.querySelectorAll(".operator[data-op]").forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.op === pendingOperator
            );
        });
    }

    function clearAll() {
        entry = "0";

        accumulator = null;
        pendingOperator = null;

        waitingForOperand = false;
        justEvaluated = false;
        errorState = false;

        lastOperator = null;
        lastOperand = null;

        liveExpression = "0";
        completedExpression = "";

        updateSelectedOperator();
        updateDisplay();
    }

    function clearEntry() {
        if (errorState) {
            clearAll();
            return;
        }

        entry = "0";
        justEvaluated = false;

        if (pendingOperator !== null) {
            waitingForOperand = true;

            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator
            );
        } else {
            waitingForOperand = false;
            accumulator = null;

            liveExpression = "0";
            completedExpression = "";

            lastOperator = null;
            lastOperand = null;
        }

        updateDisplay();
    }

    function handleClear() {
        if (clearButton.textContent === "AC") {
            clearAll();
        } else {
            clearEntry();
        }
    }

    function startNewCalculation() {
        accumulator = null;
        pendingOperator = null;

        waitingForOperand = false;
        justEvaluated = false;

        lastOperator = null;
        lastOperand = null;

        completedExpression = "";
        liveExpression = "";

        updateSelectedOperator();
    }

    function inputNumber(number) {
        if (errorState) {
            clearAll();
        }

        if (justEvaluated) {
            startNewCalculation();
            entry = number;
            liveExpression = number;
        } else if (waitingForOperand) {
            entry = number;
            waitingForOperand = false;
        } else {
            const digitCount = entry.replace(/[-.]/g, "").length;

            if (digitCount >= 16) {
                return;
            }

            if (entry === "0") {
                entry = number;
            } else if (entry === "-0") {
                entry = "-" + number;
            } else {
                entry += number;
            }
        }

        if (pendingOperator !== null) {
            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator,
                entry
            );
        } else {
            liveExpression = entry;
        }

        updateDisplay();
    }

    function inputDecimal() {
        if (errorState) {
            clearAll();
        }

        if (justEvaluated) {
            startNewCalculation();
            entry = "0.";
        } else if (waitingForOperand) {
            entry = "0.";
            waitingForOperand = false;
        } else if (!entry.includes(".")) {
            entry += ".";
        }

        if (pendingOperator !== null) {
            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator,
                entry
            );
        } else {
            liveExpression = entry;
        }

        updateDisplay();
    }

    function calculate(first, operator, second) {
        switch (operator) {
            case "+":
                return first + second;

            case "−":
                return first - second;

            case "×":
                return first * second;

            case "÷":
                return second === 0 ? NaN : first / second;

            default:
                return second;
        }
    }

    function selectOperator(operator) {
        if (errorState) {
            return;
        }

        completedExpression = "";

        // Replace the pending operator if the second operand hasn't started.
        if (pendingOperator !== null && waitingForOperand) {
            pendingOperator = operator;

            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator
            );

            updateSelectedOperator();
            updateDisplay();
            return;
        }

        // Evaluate the previous operation from left to right.
        if (pendingOperator !== null && !waitingForOperand) {
            const result = calculate(
                accumulator,
                pendingOperator,
                Number(entry)
            );

            if (!Number.isFinite(result)) {
                showError();
                return;
            }

            accumulator = result;
            entry = formatNumber(result);
        } else if (accumulator === null) {
            accumulator = Number(entry);
        }

        if (justEvaluated) {
            lastOperator = null;
            lastOperand = null;
        }

        pendingOperator = operator;
        waitingForOperand = true;
        justEvaluated = false;

        liveExpression = formatLiveExpression(
            accumulator,
            pendingOperator
        );

        updateSelectedOperator();
        updateDisplay();
    }

    function equals() {
        if (errorState) {
            return;
        }

        if (pendingOperator !== null) {
            const first = accumulator;

            const second = waitingForOperand
                ? accumulator
                : Number(entry);

            const operator = pendingOperator;

            const result = calculate(
                first,
                operator,
                second
            );

            if (!Number.isFinite(result)) {
                showError();
                return;
            }

            lastOperator = operator;
            lastOperand = second;

            completedExpression =
                `${formatLiveExpression(first, operator, formatNumber(second))} =`;

            entry = formatNumber(result);
            accumulator = result;

            pendingOperator = null;
            waitingForOperand = false;
            justEvaluated = true;

            liveExpression = entry;

            updateSelectedOperator();
            updateDisplay();
            return;
        }

        // Repeated equals repeats the previous calculation.
        if (justEvaluated && lastOperator !== null) {
            const first = Number(entry);

            const result = calculate(
                first,
                lastOperator,
                lastOperand
            );

            if (!Number.isFinite(result)) {
                showError();
                return;
            }

            completedExpression =
                `${formatLiveExpression(first, lastOperator, formatNumber(lastOperand))} =`;

            entry = formatNumber(result);
            accumulator = result;
            liveExpression = entry;

            updateDisplay();
        }
    }

    function percent() {
        if (errorState || waitingForOperand) {
            return;
        }

        const value = Number(entry);
        let result;

        if (
            pendingOperator === "+" ||
            pendingOperator === "−"
        ) {
            result = accumulator * value / 100;
        } else {
            result = value / 100;
        }

        if (!Number.isFinite(result)) {
            showError();
            return;
        }

        entry = formatNumber(result);
        waitingForOperand = false;
        justEvaluated = false;

        if (pendingOperator !== null) {
            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator,
                entry
            );
        } else {
            liveExpression = entry;
        }

        updateDisplay();
    }

    function toggleSign() {
        if (errorState) {
            return;
        }

        if (entry.startsWith("-")) {
            entry = entry.slice(1);
        } else {
            entry = "-" + entry;
        }

        if (pendingOperator !== null) {
            waitingForOperand = false;

            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator,
                entry
            );
        } else {
            liveExpression = entry;
        }

        justEvaluated = false;
        updateDisplay();
    }

    function backspace() {
        if (errorState) {
            clearAll();
            return;
        }

        if (justEvaluated) {
            justEvaluated = false;
            lastOperator = null;
            lastOperand = null;
            accumulator = null;
            pendingOperator = null;
            completedExpression = "";
            liveExpression = entry;
        }

        if (pendingOperator !== null && waitingForOperand) {
            // Remove the pending operator.
            entry = formatNumber(accumulator);

            accumulator = null;
            pendingOperator = null;
            waitingForOperand = false;

            liveExpression = entry;

            updateSelectedOperator();
            updateDisplay();
            return;
        }

        if (pendingOperator !== null && !waitingForOperand) {
            // Remove the entire second operand.
            entry = "0";
            waitingForOperand = true;

            liveExpression = formatLiveExpression(
                accumulator,
                pendingOperator
            );

            updateDisplay();
            return;
        }

        if (entry.length > 1) {
            entry = entry.slice(0, -1);

            if (entry === "-" || entry === "") {
                entry = "0";
            }
        } else {
            entry = "0";
        }

        liveExpression = entry;
        updateDisplay();
    }

    function showError() {
        entry = "Error";

        accumulator = null;
        pendingOperator = null;

        waitingForOperand = false;
        justEvaluated = false;
        errorState = true;

        lastOperator = null;
        lastOperand = null;

        liveExpression = "Error";
        completedExpression = "";

        updateSelectedOperator();
        updateDisplay();
    }

    // Button interaction
    document.querySelector(".keys").addEventListener("click", event => {
        const button = event.target.closest("button");

        if (!button) {
            return;
        }

        if (button.dataset.number !== undefined) {
            inputNumber(button.dataset.number);
            return;
        }

        if (button.dataset.op !== undefined) {
            selectOperator(button.dataset.op);
            return;
        }

        switch (button.dataset.action) {
            case "clear":
                handleClear();
                break;

            case "backspace":
                backspace();
                break;

            case "percent":
                percent();
                break;

            case "sign":
                toggleSign();
                break;

            case "decimal":
                inputDecimal();
                break;

            case "equals":
                equals();
                break;
        }
    });

    // Keyboard support
    document.addEventListener("keydown", event => {
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
        ) {
            return;
        }

        const key = event.key;

        if (/^[0-9]$/.test(key)) {
            inputNumber(key);
        } else if (key === ".") {
            inputDecimal();
        } else if (key === "+") {
            selectOperator("+");
        } else if (key === "-") {
            selectOperator("−");
        } else if (key === "*") {
            selectOperator("×");
        } else if (key === "/") {
            event.preventDefault();
            selectOperator("÷");
        } else if (key === "%") {
            percent();
        } else if (key === "Enter" || key === "=") {
            event.preventDefault();
            equals();
        } else if (key === "Backspace") {
            event.preventDefault();
            backspace();
        } else if (key === "Escape") {
            clearAll();
        }
    });

    updateDisplay();
