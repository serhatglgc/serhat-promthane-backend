const badWords = [
    'amk', 'aq', 'sik', 'siktir', 'oç', 'piç', 'yarak', 'amcik', 'göt', 'ibne', 'meme', 'porno', 'seks', 'sex', 'escort', 'kumar', 'bet', 'bahis',
    'şerefsiz', 'kan', 'vahşet', 'cinsellik', 'çıplak', 'küfür', 'orospu', 'yavşak', 'salak', 'aptal', 'gerizekalı', 'bok', 'mal', 'puşt'
];

const hasBadWords = (text) => {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Hard block HTML tags to prevent XSS/injection disguised as prompts
    if (/<[^>]*>/g.test(lowerText)) return true;
    
    // Normalize string to catch bypasses
    const normalized = lowerText
        .replace(/!/g, 'i')
        .replace(/@/g, 'a')
        .replace(/3/g, 'e')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i');

    return badWords.some(word => {
        return normalized.includes(word);
    });
};

module.exports = { hasBadWords };
