const hours = function* (hours) {
    let i = 0;
    while (i < hours * 3600 / 30) {
        yield i++;
    }
}

const days = function* (days) {
    let i = 0;
    while (i < days * 3600 * 24 / 30) {
        yield i++;
    }
}

module.exports = {
    hours,
    days,
}