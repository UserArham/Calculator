 function formatNumber(number) {
        if (!Number.isFinite(number)) {
            return "Error";
        }

        if (Object.is(number, -0)) {
            number = 0;
        }

        return Number.parseFloat(number.toPrecision(12)).toString();
    }
