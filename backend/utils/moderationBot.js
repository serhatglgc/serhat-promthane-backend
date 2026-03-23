const hasBadWords = (text) => {
    if (!text) return false;

    const lowerText = text.toLowerCase();

    // Only block HTML tags to prevent XSS/injection
    if (/<[^>]*>/g.test(lowerText)) return true;

    return false;
};

module.exports = { hasBadWords };
