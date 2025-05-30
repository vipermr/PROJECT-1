const cooldowns = new Map();
const COOLDOWN_SECONDS = 30; // Cooldown duration in seconds

module.exports = {
  config: {
    name: "match3",
    aurthor: "NAFIJ PRO ✅", // As requested
    role: 0,
    shortDescription: "Finds a text-based match with unique messages.",
    longDescription: "Pairs you with an opposite-gender partner (or a specific user) and provides a unique text message for each compatibility percentage. No images involved.",
    category: "love",
    guide: "{pn} or {pn} @[user]"
  },

  onStart: async function ({ api, event, args, usersData, threadsData }) {
    const senderID = event.senderID;
    const threadID = event.threadID;
    const messageID = event.messageID;
    const botID = api.getCurrentUserID();

    // --- Cooldown Check ---
    const now = Date.now();
    if (cooldowns.has(senderID)) {
      const expirationTime = cooldowns.get(senderID) + COOLDOWN_SECONDS * 1000;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return api.sendMessage(
          `Please wait ${timeLeft.toFixed(1)} seconds before using the \`match3\` command again.`,
          threadID,
          messageID
        );
      }
    }

    // --- 1. Get Sender Information ---
    let senderInfo = await usersData.get(senderID);
    const senderName = senderInfo ? senderInfo.name : "User";
    
    let senderGender = null;
    if (senderInfo && (senderInfo.gender === 'MALE' || senderInfo.gender === 'FEMALE')) {
        senderGender = senderInfo.gender;
    } else {
        try {
            const threadInfo = await api.getThreadInfo(threadID);
            const userInfoInThread = threadInfo.userInfo.find(u => u.id === senderID);
            if (userInfoInThread && (userInfoInThread.gender === 'MALE' || userInfoInThread.gender === 'FEMALE')) {
                senderGender = userInfoInThread.gender;
            }
        } catch (error) {
            console.warn("Could not retrieve sender gender from thread info:", error);
        }
    }

    // --- 2. Determine Partner ID and Name ---
    let partnerID;
    let partnerName;

    // Check if a specific user was mentioned
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      partnerID = Object.keys(event.mentions)[0];

      if (partnerID === senderID) {
        return api.sendMessage("You can't match with yourself, even in text! 😉", threadID, messageID);
      }
      if (partnerID === botID) {
        return api.sendMessage("I'm a bot, darling! I can't be your match! 🤖", threadID, messageID);
      }

      let mentionedPartnerInfo = await usersData.get(partnerID);
      partnerName = mentionedPartnerInfo ? mentionedPartnerInfo.name : "That user";

    } else {
      // No specific mention, find a random partner of the opposite gender
      const threadInfo = await api.getThreadInfo(threadID);
      const allUsersInThread = threadInfo.userInfo;
      let oppositeGenderPartners = [];

      if (!senderGender) {
        return api.sendMessage(
            "🫣 🦥 I couldn't determine your gender from Facebook. Please ensure your gender is set to 'Male' or 'Female' on your profile to use random opposite-gender matching!",
            threadID,
            messageID
        );
      }

      for (let user of allUsersInThread) {
        if (user.id === senderID || user.id === botID) {
          continue;
        }

        let userGender = user.gender; 
        if (!userGender && usersData.get(user.id)) {
            userGender = usersData.get(user.id).gender;
        }
        
        if (senderGender === "FEMALE" && userGender === "MALE") {
          oppositeGenderPartners.push(user.id);
        } else if (senderGender === "MALE" && userGender === "FEMALE") {
          oppositeGenderPartners.push(user.id);
        }
      }

      if (oppositeGenderPartners.length === 0) {
        return api.sendMessage(
          "🫣 🦥 I couldn't find an opposite-gender partner for you in this group. Try again later!",
          threadID,
          messageID
        );
      }

      partnerID = oppositeGenderPartners[Math.floor(Math.random() * oppositeGenderPartners.length)];
      let randomPartnerInfo = await usersData.get(partnerID);
      partnerName = randomPartnerInfo ? randomPartnerInfo.name : "A Mysterious Partner";
    }

    // --- 3. Calculate Compatibility Percentage and Unique Message ---
    const rawCompatibilityScore = Math.floor(Math.random() * 101); // 0 to 100
    const specialScores = {
        "-1": "Whoops! Negative one percent? You're so incompatible, you actually repel each other through time and space. Fascinating!",
        "0": "Zero percent! The universe just confirmed you two are on entirely different planes of existence. Good luck with that!",
        "99.99": "Ninety-nine point ninety-nine percent! Almost perfect, but that tiny fraction leaves just enough room for a single, adorable flaw. It's beautiful!",
        "101": "One hundred and one percent! You've broken the compatibility scale! Your connection transcends conventional metrics. Are you soulmates from another dimension?"
    };

    let compatibilityScore;
    let compatibilityPhrase;

    // Introduce a small chance for special percentages
    const specialChance = Math.random(); // 0 to 1
    if (specialChance < 0.05) { // 5% chance for a special score
        const specialKeys = Object.keys(specialScores);
        compatibilityScore = specialKeys[Math.floor(Math.random() * specialKeys.length)];
        compatibilityPhrase = specialScores[compatibilityScore];
    } else {
        compatibilityScore = rawCompatibilityScore.toString();
        // Unique messages for each percentage 0-100
        const percentageMessages = {
            "0": "0%: The silence between you speaks volumes... about absolutely nothing. Blank slate!",
            "1": "1%: A flicker of potential, like a single spark in a very, very dark room. Don't blink!",
            "2": "2%: You share the same atmospheric pressure. That's a start, right?",
            "3": "3%: You both exist within the same observable universe. Mind-blowing!",
            "4": "4%: You probably both use the internet. The common ground is vast!",
            "5": "5%: Your cosmic paths briefly intersected. That counts!",
            "6": "6%: There's a faint echo of understanding, like whispering across a canyon.",
            "7": "7%: You might share a favorite color... or a distant ancestor. Who knows?",
            "8": "8%: A barely perceptible hum of connection. Keep listening!",
            "9": "9%: Just enough to acknowledge each other's existence. Progress!",
            "10": "10%: You're aligned on at least one very, very minor thing. Like the decimal point!",
            "11": "11%: A tiny bit more than 10%. Every little bit counts!",
            "12": "12%: There's a small, curious overlap in your personal Venn diagrams.",
            "13": "13%: Unlucky for some, but for you two, it's a unique starting point!",
            "14": "14%: You might agree on which way is up. Basic alignment!",
            "15": "15%: A foundational layer of 'not actively repelling each other.' Solid!",
            "16": "16%: You could probably share an awkward silence comfortably. It's a skill!",
            "17": "17%: A surprising hint of harmony. What's your secret?",
            "18": "18%: You're in the double digits! That's practically a relationship!",
            "19": "19%: Just shy of 20%, but with boundless potential for growth!",
            "20": "20%: Okay, you're not entirely opposites! There's a 1 in 5 chance of agreement!",
            "21": "21%: You're starting to get into the 'might tolerate each other' territory. Breakthrough!",
            "22": "22%: A subtle gravitational pull. Nothing dramatic, but it's there.",
            "23": "23%: Almost a quarter compatible! Time for a mini-celebration!",
            "24": "24%: On the cusp of something... maybe. The suspense!",
            "25": "25%: A solid quarter! You could probably build a small, stable table together.",
            "26": "26%: Slightly better than a quarter. Growth is always good!",
            "27": "27%: A hint of positive vibes, like a gentle breeze on a warm day.",
            "28": "28%: The universe is whispering, 'Could be...!'",
            "29": "29%: Almost 30! You're practically best friends with potential!",
            "30": "30%: You've got some common ground! Enough to share a bag of chips!",
            "31": "31%: Just enough to make things interesting. Spice of life!",
            "32": "32%: A low hum of positive connection. Like a happy refrigerator.",
            "33": "33%: A third of the way there! This calls for a high-five!",
            "34": "34%: Building bridges, one tiny agreement at a time.",
            "35": "35%: A noticeable flicker of shared interests. What's the secret sauce?",
            "36": "36%: You're almost at the sweet spot of 'mildly interesting.'",
            "37": "37%: Your quirks complement each other in unexpected ways.",
            "38": "38%: There's definitely something brewing here. Keep an eye on it!",
            "39": "39%: On the verge of 40! Exciting times ahead!",
            "40": "40%: A good, solid base. You could probably co-exist without major incidents!",
            "41": "41%: A little bit more alignment than yesterday. Continuous improvement!",
            "42": "42%: The answer to life, the universe, and everything might just be your compatibility!",
            "43": "43%: A surprising amount of synergy. Who knew?",
            "44": "44%: Almost half! The universe is giving you a thumbs up!",
            "45": "45%: You're entering the 'might actually enjoy each other's company' zone!",
            "46": "46%: Just shy of halfway, but with a mighty leap in potential!",
            "47": "47%: The stars are subtly aligning in your favor. Nice!",
            "48": "48%: Almost there! You're on the brink of significant understanding!",
            "49": "49%: One tiny step away from 50%! The anticipation!",
            "50": "50%: Exactly half! Perfectly balanced, as all things should be. A truly even match!",
            "51": "51%: Just nudging over the halfway mark! Momentum is on your side!",
            "52": "52%: A little extra sparkle in your connection. Shine on!",
            "53": "53%: You're heading in the right direction, with a little extra oomph!",
            "54": "54%: A surprisingly strong bond forming. Keep nurturing it!",
            "55": "55%: More than half! You're officially 'compatible' by most standards!",
            "56": "56%: Your energies are harmonizing nicely. Good vibes all around!",
            "57": "57%: A delightful blend of personalities. Like a perfect smoothie!",
            "58": "58%: You're making waves together. Big things might be on the horizon!",
            "59": "59%: Almost 60%! The future looks promising!",
            "60": "60%: A solid, undeniable connection. You two just 'get' each other!",
            "61": "61%: Beyond just getting along, you're thriving together!",
            "62": "62%: A fantastic foundation for growth and shared adventures!",
            "63": "63%: Your compatibility is blossoming beautifully!",
            "64": "64%: Approaching excellent territory! You're almost there!",
            "65": "65%: Well over halfway! Your bond is clearly defined!",
            "66": "66%: A truly delightful match! You're making others jealous!",
            "67": "67%: Your connection radiates positive energy!",
            "68": "68%: So close to being highly compatible! The anticipation is thrilling!",
            "69": "69%: Nice. Very nice. Your compatibility is smooth and fun!",
            "70": "70%: High compatibility! You're practically finishing each other's sentences!",
            "71": "71%: Your spirits dance in perfect sync! A joy to behold!",
            "72": "72%: This match is undeniably strong. Like a perfectly brewed coffee!",
            "73": "73%: You share a rare and beautiful understanding. Cherish it!",
            "74": "74%: On the brink of something truly amazing! Brace yourselves!",
            "75": "75%: Three-quarters of the way to perfection! A power duo!",
            "76": "76%: Your synergy is off the charts! Prepare for greatness!",
            "77": "77%: Lucky sevens! Your connection is blessed by good fortune!",
            "78": "78%: A fantastic blend of strengths and quirks. What a team!",
            "79": "79%: Almost 80%! You're practically two peas in a pod!",
            "80": "80%: Excellent compatibility! You're a force to be reckoned with!",
            "81": "81%: Your hearts beat in beautiful rhythm. Simply harmonious!",
            "82": "82%: A deep and profound understanding between you. Magical!",
            "83": "83%: Your connection is incredibly strong, like a well-tied knot!",
            "84": "84%: Nearing the absolute peak of compatibility! Astounding!",
            "85": "85%: Phenomenal compatibility! You're almost perfect together!",
            "86": "86%: Your souls sing the same song. Truly magnificent!",
            "87": "87%: An extraordinary bond! This kind of connection is rare!",
            "88": "88%: Double eights! Your compatibility is perfectly balanced and powerful!",
            "89": "89%: One step away from total cosmic alignment! The universe approves!",
            "90": "90%: Nearly flawless! You're practically destined to be together! 💖",
            "91": "91%: You share an almost telepathic understanding. Incredible!",
            "92": "92%: Your connection is simply divine. Like a perfectly orchestrated symphony!",
            "93": "93%: A bond that defies explanation. Pure magic!",
            "94": "94%: Your spirits intertwine perfectly. It's a beautiful sight!",
            "95": "95%: Beyond excellent! You're practically a match made in legend!",
            "96": "96%: Your compatibility shines brighter than a supernova! ✨",
            "97": "97%: An unbelievably strong connection. You complete each other!",
            "98": "98%: So, so close to perfection! You're two halves of a whole!",
            "99": "99%: Almost perfect! Just enough room for tiny, adorable quirks. Simply wonderful!",
            "100": "100%: A perfect match! Your compatibility is absolutely flawless. Congrats!"
        };
        compatibilityPhrase = percentageMessages[compatibilityScore] || "An unexpected compatibility result!"; // Fallback
    }

    // --- 4. Construct and Send Message ---
    const messageBody = `💖 **${senderName}** and **${partnerName}** have been matched!\n\n**Compatibility: ${compatibilityScore}%**\n${compatibilityPhrase}`;

    // Set cooldown for the user
    cooldowns.set(senderID, now);

    return api.sendMessage(
      {
        body: messageBody,
        mentions: [
          { tag: senderName, id: senderID },
          { tag: partnerName, id: partnerID },
        ],
      },
      threadID,
      messageID
    );
  },
};
