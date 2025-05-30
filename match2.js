const { loadImage, createCanvas } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");

// Store cooldowns for users
const cooldowns = new Map();
const COOLDOWN_SECONDS = 30; // Cooldown duration in seconds

module.exports = {
  config: {
    name: "match2",
    aurthor: "ntkhangs",
    role: 0,
    shortDescription: "Finds a potential match for you.",
    longDescription: "This command attempts to pair you with an opposite-gender user in the group. If no suitable partner is found, it will notify you.",
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
          `Please wait ${timeLeft.toFixed(1)} seconds before using the \`match2\` command again.`,
          threadID,
          messageID
        );
      }
    }

    // Define paths for temporary image files
    const pathImg = __dirname + "/tmp/background.png";
    const pathAvt1 = __dirname + "/tmp/Avtmot.png";
    const pathAvt2 = __dirname + "/tmp/Avthai.png";

    // Ensure tmp directory exists
    await fs.ensureDir(__dirname + "/tmp");

    // --- 1. Get Sender Information ---
    let senderInfo = await usersData.get(senderID);
    const senderName = senderInfo ? senderInfo.name : "User";
    
    // Attempt to get sender's gender from usersData, then threadInfo, normalize to 'MALE'/'FEMALE'
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
      // Get the ID of the first mentioned user
      partnerID = Object.keys(event.mentions)[0];

      // Prevent pairing with self or bot
      if (partnerID === senderID) {
        return api.sendMessage("You can't pair with yourself, silly! 😉", threadID, messageID);
      }
      if (partnerID === botID) {
        return api.sendMessage("I'm flattered, but I can't be your partner! I'm a bot! 🤖", threadID, messageID);
      }

      // If a specific user is mentioned, we assume the user wants to try matching them regardless of strict gender,
      // as the user has made an explicit choice.
      let mentionedPartnerInfo = await usersData.get(partnerID);
      partnerName = mentionedPartnerInfo ? mentionedPartnerInfo.name : "That user";

    } else {
      // No specific mention, find a random partner of the opposite gender
      const threadInfo = await api.getThreadInfo(threadID);
      const allUsersInThread = threadInfo.userInfo;
      let oppositeGenderPartners = [];

      // If sender's gender isn't definitively known, we can't find an opposite-gender match
      if (!senderGender) {
        return api.sendMessage(
            "🫣 🦥 I couldn't determine your gender from Facebook. Please ensure your gender is set to 'Male' or 'Female' on your profile to use random opposite-gender matching!",
            threadID,
            messageID
        );
      }

      // Filter for opposite-gender partners only
      for (let user of allUsersInThread) {
        // Skip sender and bot
        if (user.id === senderID || user.id === botID) {
          continue;
        }

        // Get user's gender, prioritize threadInfo as it's typically more current for live users
        let userGender = user.gender; 
        if (!userGender && usersData.get(user.id)) { // Fallback to usersData if not in threadInfo
            userGender = usersData.get(user.id).gender;
        }

        // Only add if gender is explicitly the opposite of sender's
        if (senderGender === "FEMALE" && userGender === "MALE") {
          oppositeGenderPartners.push(user.id);
        } else if (senderGender === "MALE" && userGender === "FEMALE") {
          oppositeGenderPartners.push(user.id);
        }
      }

      // If no opposite-gender partner is found, tell the user
      if (oppositeGenderPartners.length === 0) {
        return api.sendMessage(
          "🫣 🦥 I couldn't find an opposite-gender partner for you in this group. Try again later!",
          threadID,
          messageID
        );
      }

      // Select a random partner from the opposite-gender list
      partnerID = oppositeGenderPartners[Math.floor(Math.random() * oppositeGenderPartners.length)];
      let randomPartnerInfo = await usersData.get(partnerID);
      partnerName = randomPartnerInfo ? randomPartnerInfo.name : "A Mysterious Partner";
    }

    // --- 3. Calculate Compatibility Percentage and Message ---
    const randomPercent = Math.floor(Math.random() * 100) + 1; // 1 to 100
    const specialPercentages = ["0", "-1", "99.99", "-99", "-100", "101", "0.01"];
    const compatibilityValues = [
      `${randomPercent}`, `${randomPercent}`, `${randomPercent}`, `${randomPercent}`, `${randomPercent}`,
      `${specialPercentages[Math.floor(Math.random() * specialPercentages.length)]}`,
      `${randomPercent}`, `${randomPercent}`, `${randomPercent}`, `${randomPercent}`
    ];
    const compatibilityScore = parseFloat(compatibilityValues[Math.floor(Math.random() * compatibilityValues.length)]);

    let compatibilityPhrase;
    if (compatibilityScore >= 90 && compatibilityScore <= 100) {
      compatibilityPhrase = "A match made in heaven! Absolutely perfect! 💖";
    } else if (compatibilityScore >= 70) {
      compatibilityPhrase = "Amazing compatibility! You two are a great match! 🥰";
    } else if (compatibilityScore >= 50) {
      compatibilityPhrase = "Pretty good compatibility! There's definite potential! 😊";
    } else if (compatibilityScore >= 20) {
      compatibilityPhrase = "Some compatibility here! Give it a shot! 😉";
    } else if (compatibilityScore > 0) {
      compatibilityPhrase = "Well, opposites attract, right? 😉";
    } else if (compatibilityScore === 0) {
        compatibilityPhrase = "It's 0%! Better luck next time or maybe this is a prank! 😂";
    }
    else {
      compatibilityPhrase = "Uh oh, seems like a negative match! That's... unique! 😅";
    }

    // --- 4. Select Background Image ---
    const backgroundImages = [
      "https://i.postimg.cc/wjJ29HRB/background1.png",
      "https://i.postimg.cc/zf4Pnshv/background2.png",
      "https://i.postimg.cc/5tXRQ46D/background3.png",
    ];
    const selectedBackground = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];

    // --- 5. Image Processing and Sending Message ---
    try {
      // Download and save avatars and background
      const [getSenderAvt, getPartnerAvt, getBackground] = await Promise.all([
        axios.get(`https://graph.facebook.com/${senderID}/picture?width=720&height=770&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
        axios.get(`https://graph.facebook.com/${partnerID}/picture?width=720&height=770&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
        axios.get(selectedBackground, { responseType: "arraybuffer" })
      ]);

      fs.writeFileSync(pathAvt1, Buffer.from(getSenderAvt.data, "utf-8"));
      fs.writeFileSync(pathAvt2, Buffer.from(getPartnerAvt.data, "utf-8"));
      fs.writeFileSync(pathImg, Buffer.from(getBackground.data, "utf-8"));

      // Load images onto canvas
      const baseImage = await loadImage(pathImg);
      const baseAvt1 = await loadImage(pathAvt1);
      const baseAvt2 = await loadImage(pathAvt2);

      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      // Avatar positions (can be customized here if needed)
      const avatarSize = 300;
      const avatar1X = 100;
      const avatar2X = baseImage.width - avatarSize - 100; // Right side
      const avatarY = 150;

      ctx.drawImage(baseAvt1, avatar1X, avatarY, avatarSize, avatarSize);
      ctx.drawImage(baseAvt2, avatar2X, avatarY, avatarSize, avatarSize);

      // Save the combined image
      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(pathImg, imageBuffer);

      // Construct the message body
      const messageBody = `🎉 **${senderName}** and **${partnerName}** have been matched!\n\n**Compatibility: ${compatibilityScore}%**\n${compatibilityPhrase}`;

      // Set cooldown for the user
      cooldowns.set(senderID, now);

      // Send the message with the generated image
      return api.sendMessage(
        {
          body: messageBody,
          mentions: [
            { tag: senderName, id: senderID },
            { tag: partnerName, id: partnerID },
          ],
          attachment: fs.createReadStream(pathImg),
        },
        threadID,
        () => fs.unlinkSync(pathImg), // Delete the combined image after sending
        messageID
      );

    } catch (error) {
      console.error("Error during match2 command execution:", error);
      // Inform the user if something went wrong
      return api.sendMessage(
        "Oops! Something went wrong while finding a match. Please try again or contact the bot admin! 🚧",
        threadID,
        messageID
      );
    } finally {
      // Ensure temporary avatar files are removed even if an error occurs
      fs.remove(pathAvt1).catch(err => console.error("Failed to remove temporary avatar 1:", err));
      fs.remove(pathAvt2).catch(err => console.error("Failed to remove temporary avatar 2:", err));
    }
  },
};
