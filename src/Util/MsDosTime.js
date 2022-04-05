export default class MsDosTime {
    /** @type {Date} */ static MIN = new Date(1980, 0, 1);
    /** @type {Date} */ static MAX = new Date(2107, 11, 31);

    /**
     * http://www.delorie.com/djgpp/doc/rbinter/it/65/16.html
     *
     * @param {Date} date
     * @returns {number}
     */
    static encodeTime(date) {
        date = this.clampDate(date);
        let res = 0;
        res |= Math.floor(date.getSeconds() / 2) & 0b11111;
        res |= (date.getMinutes() & 0b111111) << 5;
        res |= (date.getHours() & 0b11111) << 11;
        return res;
    }

    /**
     * http://www.delorie.com/djgpp/doc/rbinter/it/66/16.html
     *
     * @param {Date} date
     * @returns {number}
     */
    static encodeDate(date) {
        date = this.clampDate(date);
        let res = 0;
        res |= date.getDate() & 0b11111;
        res |= ((date.getMonth() + 1) & 0b1111) << 5;
        res |= ((date.getFullYear() - 1980) & 0b1111111) << 9;
        return res;
    }

    /**
     * @param {number} date
     * @param {number} time
     * @returns {Date}
     */
    static decode(date, time) {
        let seconds = (time & 0b11111) * 2,
            minutes = (time >> 5) & 0b111111,
            hours = (time >> 11),
            day = date & 0b11111,
            month = ((date >> 5) & 0b1111) + 1,
            year = (date >> 9) + 1980;

        return new Date(year, month, day, hours, minutes, seconds, 0);
    }

    /**
     * @param {Date} time
     */
    static clampDate(time) {
        if (time < this.MIN) {
            return this.MIN;
        }
        if (time > this.MAX) {
            return this.MAX;
        }
        return time;
    }
}
