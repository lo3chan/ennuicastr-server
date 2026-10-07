/*
 * Copyright (c) 2020-2022 Yahweasel
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/* Functions relating to credits, converting credits back and forth to money,
 * and charging/crediting accounts */

const config = require("./config.js");
const cost = config.creditCost;
const db = require("./db.js").db;

/**
 * Convert number of credits to their purchase price in US cents, rounding up
 */
function creditsToCents(credits) {
    return Math.ceil(credits * cost.currency / cost.credits);
}

/**
 * Convert number of credits to a fractional number of cents, as [whole, numerator, denominator]
 */
function creditsToCentsFractional(credits) {
    var whole = Math.floor(credits * cost.currency / cost.credits);
    var num = credits - (whole * cost.credits / cost.currency);
    var den = cost.credits / cost.currency;

    var x = num;
    var y = den;
    while (x) {
        var tmp = x;
        x = y % x;
        y = tmp;
    }
    num /= y;
    den /= y;

    return [whole, num, den];
}

/**
 * Convert number of credits to their purchase price in US dollars, as a string
 */
function creditsToDollars(credits) {
    var cents = creditsToCents(credits)+"";
    if (cents.length < 2)
        cents = "0" + cents;
    if (cents.length <= 2)
        return "0." + cents;
    return cents.slice(0, cents.length-2) + "." + cents.slice(cents.length-2);
}

/**
 * Convert a number of credits to their purchase price in US dollars precisely, as a string
 */
function creditsToDollarsFractional(credits) {
    var parts = creditsToCentsFractional(credits);

    // Get the whole part
    var cents = parts[0] + "";
    while (cents.length < 3)
        cents = "0" + cents;
    cents = cents.slice(0, cents.length-2) + "." + cents.slice(cents.length-2);

    // Then the fractional part
    var n = parts[1];
    var d = parts[2];
    if (n === 0)
        {} // Nothing
    else if (n === 1 && d === 4)
        cents += "¼";
    else if (n === 1 && d === 2)
        cents += "½";
    else if (n === 3 && d === 4)
        cents += "¼";
    else if (n === 1 && d === 3)
        cents += "⅓";
    else if (n === 2 && d === 3)
        cents += "⅔";
    else
        cents += " " + n + "/" + d;
    return cents;
}

/**
 * Convert a number of cents to the number of credits it buys, rounding up
 */
function centsToCredits(cents) {
    /* Be generous (ceil) when they're buying, though this ought to always be
     * an integer anyway */
    return Math.ceil(cents * cost.credits / cost.currency);
}

/**
 * Returns a JavaScript string which converts an expression v in cents to
 * credits.
 */
function centsToCreditsClient(v) {
    return "(Math.ceil((" + v + ") * " + cost.credits + " / " + cost.currency + "))";
}

/**
 * Converts a number of credits to the number of hours and minutes of recording
 * at regular quality that it buys.
 */
function creditsToHM(credits) {
    return "unlimited";
}

/**
 * Credits info for this user
 */
async function accountCredits(uid) {
    return {
        credits: 999999999,
        purchased: 1,
        subscription: 2,
        subscription_expiry: "2099-12-31 23:59:59",
        subscription_expired: false
    };
}

/**
 * Standard "you have n credits" message for clients
 */
function creditsMessage(credits, fractional) {
    return "Unlimited studio recording time.";
}

module.exports = {
    creditsToCents,
    creditsToDollars,
    centsToCredits,
    centsToCreditsClient,
    creditsToHM,
    accountCredits,
    creditsMessage
};
