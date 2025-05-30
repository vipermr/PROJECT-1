const { loadImage, createCanvas } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra"); // Make sure fs-extra is installed: npm install fs-extra

// --- Configuration for Backgrounds ---
const BASE_BACKGROUND_URL = "https://raw.githubusercontent.com/alkama844/res/refs/heads/main/match/backpro";
const NUM_BACKGROUNDS = 24; // From backpro1.jpg to backpro24.jpg

// --- Avatar Positioning & Sizing Controls (RELATIVE TO BACKGROUND IMAGE) ---
// These are ratios (0 to 1) relative to the background image's dimensions.
// ADJUSTED VALUES:
const avatarRelativeSize = 0.35;   // Avatars will be 35% of the BACKGROUND's height (bigger).
const avatarRelativeY = 0.4;      // Avatars' top edge will be 40% down from the BACKGROUND's top edge (more down).
const avatarRelativeXGap = 0.04;  // Avatars' gap from left/right edges will be 4% of the BACKGROUND's width (closer).

// --- Cooldowns and Utility ---
const cooldowns = new Map();
const COOLDOWN_SECONDS = 30; // Cooldown duration in seconds

// --- Main Command Logic ---
module.exports = {
  config: {
    name: "match", // Command name
    aurthor: "NAFIJ PRO ✅", // Author as requested
    role: 0,
    shortDescription: "Finds a potential match and generates a custom image.",
    longDescription: "This command attempts to pair you with an opposite-gender user (or a specific user) and calculates a compatibility percentage, generating an image with dynamically changing backgrounds and unique messages. Has a cooldown to prevent spam.",
    category: "love",
    guide: "{pn} or {pn} @user"
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
          `Please wait ${timeLeft.toFixed(1)} seconds before using the \`match\` command again.`,
          threadID,
          messageID
        );
      }
    }

    // Define paths for temporary image files
    const pathImg = __dirname + "/tmp/match_background.png";
    const pathAvt1 = __dirname + "/tmp/match_Avtmot.png";
    const pathAvt2 = __dirname + "/tmp/match_Avthai.png";

    // Ensure tmp directory exists
    await fs.ensureDir(__dirname + "/tmp");

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
        return api.sendMessage("You can't match with yourself, silly! 😉", threadID, messageID);
      }
      if (partnerID === botID) {
        return api.sendMessage("I'm flattered, but I can't be your partner! I'm a bot! 🤖", threadID, messageID);
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
    const rawCompatibilityScore = Math.floor(Math.random() * 11) * 10; // Gives 0, 10, 20, ..., 100

    let compatibilityScore = rawCompatibilityScore.toString();
    let compatibilityPhrase;

    // Unique messages for specific intervals
    const intervalMessages = {
        "0": "Zero percent! The universe has decided you two are on entirely different wavelengths. Maybe try a parallel dimension?",
        "10": "10%! A tiny spark of connection, like two strangers making brief eye contact in a crowded room. Intriguing!",
        "20": "20%! There's a faint hum of compatibility. You might agree on the color of the sky, sometimes.",
        "30": "30%! A noticeable flicker! You could probably share a pizza without arguing about toppings... mostly.",
        "40": "40%! You're getting warmer! Enough common ground to build a small, wobbly bridge. Mind the gaps!",
        "50": "50%! Perfectly balanced! Like two sides of a coin, equally compatible but maybe never quite meeting in the middle.",
        "60": "60%! A solid connection! You might finish each other's sentences, or at least understand what they're trying to say.",
        "70": "70%! High compatibility! You're flowing together like a well-choreographed dance. Keep those steps in sync!",
        "80": "80%! Excellent synergy! You're practically a dynamic duo. Prepare for adventures and mutual understanding!",
        "90": "90%! Nearly flawless! Your connection is almost cosmic. The stars truly align when you two are around!",
        "100": "100%! ♾️ Infinity Love! 😙 Your compatibility is off the charts, boundless, and truly legendary. A match made across all dimensions!"
    };
    
    // Assign the phrase based on the generated score
    compatibilityPhrase = intervalMessages[compatibilityScore] || "An unexpected compatibility result!";

    // --- 4. Select Dynamic Background Image ---
    const backgroundIndex = Math.floor(Math.random() * NUM_BACKGROUNDS) + 1; // Random number from 1 to 24
    const selectedBackground = `${BASE_BACKGROUND_URL}${backgroundIndex}.jpg`;

    // --- 5. Image Processing and Sending Message ---
    try {
      console.log("[Match Cmd] Attempting to download avatars and background...");

      const [getSenderAvt, getPartnerAvt, getBackground] = await Promise.all([
        axios.get(`https://graph.facebook.com/${senderID}/picture?width=720&height=770&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
        axios.get(`https://graph.facebook.com/${partnerID}/picture?width=720&height=770&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" }),
        axios.get(selectedBackground, { responseType: "arraybuffer" })
      ]);

      // --- Save binary data correctly ---
      fs.writeFileSync(pathAvt1, Buffer.from(getSenderAvt.data)); 
      fs.writeFileSync(pathAvt2, Buffer.from(getPartnerAvt.data));
      fs.writeFileSync(pathImg, getBackground.data);

      console.log(`[Match Cmd] Avatar 1 saved. Size: ${fs.existsSync(pathAvt1) ? fs.statSync(pathAvt1).size : '0'} bytes.`);
      console.log(`[Match Cmd] Avatar 2 saved. Size: ${fs.existsSync(pathAvt2) ? fs.statSync(pathAvt2).size : '0'} bytes.`);
      console.log(`[Match Cmd] Background saved. Size: ${fs.existsSync(pathImg) ? fs.statSync(pathImg).size : '0'} bytes.`);
      
      console.log("[Match Cmd] Attempting to load images onto canvas...");

      const baseImage = await loadImage(pathImg);
      const baseAvt1 = await loadImage(pathAvt1);
      const baseAvt2 = await loadImage(pathAvt2);

      console.log("[Match Cmd] Images loaded successfully. Proceeding to draw.");

      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      // --- Calculate Avatar Positions (Adjusted based on your feedback) ---
      const actualAvatarSize = baseImage.height * avatarRelativeSize;
      const actualAvatarY = (baseImage.height - actualAvatarSize) * avatarRelativeY; // Vertical position based on ratio
      
      const actualHorizontalGap = baseImage.width * avatarRelativeXGap;
      const avatar1X = actualHorizontalGap;
      const avatar2X = baseImage.width - actualAvatarSize - actualHorizontalGap;
      

      ctx.drawImage(baseAvt1, avatar1X, actualAvatarY, actualAvatarSize, actualAvatarSize); 
      ctx.drawImage(baseAvt2, avatar2X, actualAvatarY, actualAvatarSize, actualAvatarSize);

      // Save the combined image
      const imageBuffer = canvas.toBuffer();
      fs.writeFileSync(pathImg, imageBuffer);

      console.log("[Match Cmd] Composite image saved. Sending to chat.");

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
      console.error(`[Match Cmd] Error during command execution:`, error);
      // Inform the user if something went wrong
      return api.sendMessage(
        "Oops! Something went wrong while finding a match or generating the image. Please try again or contact the bot admin! 🚧",
        threadID,
        messageID
      );
    } finally {
      // Ensure temporary avatar files are removed even if an error occurs
      fs.remove(pathAvt1).catch(err => console.error("[Match Cmd] Failed to remove temp avatar 1:", err));
      fs.remove(pathAvt2).catch(err => console.error("[Match Cmd] Failed to remove temp avatar 2:", err));
    }
  },
};
