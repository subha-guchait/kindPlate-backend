const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const ForgotPasswordRequest = require("../models/forgotPasswordRequestModel");
const ErrorHandler = require("../utils/errorhandler");
const generateJwtToken = require("../utils/generateJwt");

exports.register = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      userType,
      isAccepted,
    } = req.body;

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return next(new ErrorHandler("Email already exists", 409));
    }
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return next(new ErrorHandler("PhoneNo already exists", 409));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      userType,
      isAccepted,
    });

    const newUser = await user.save();
    const token = generateJwtToken(newUser);

    res.status(201).json({ success: true, token });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Unable to register", 500));
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Email and Password are required", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandler("User not exists", 404));
    }

    if (user.isBlocked) {
      return next(
        new ErrorHandler(
          "Your account has been blocked please contact support",
          403
        )
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return next(new ErrorHandler("Invalid Password", 401));
    }

    const token = generateJwtToken(user);

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Something went Wrong", 500));
  }
};

exports.resetPasswordRequest = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    const resetToken = uuidv4();
    const resetLink = `${process.env.CLIENT_URL}/update-password/${resetToken}`;

    await ForgotPasswordRequest.create({
      id: resetToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      userId: user.id,
    });

    //send resetPassword email
    const emailContent = resetPasswordTemplate(user.name, resetLink);

    try {
      await sendMail({
        to: email,
        from: {
          name: "Steller Beauty Hub",
          email: `no-reply@${process.env.EMAIL_DOMAIN}`,
        },
        ...emailContent,
      });
    } catch (err) {
      console.error("Failed to send reset email:", err);
      return next(new ErrorHandler("Email sent failed", 500));
    }
    res.status(200).json({ success: true, message: "Email sent sucessfully" });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to reset password request", 500));
  }
};

exports.verifyResetToken = async (req, res, next) => {
  try {
    const id = req.params.id;

    const forgotPasswordRequest = await ForgotPasswordRequest.findOne({ id });

    if (!forgotPasswordRequest || !forgotPasswordRequest.isActive) {
      return next(new ErrorHandler("Invalid or link expired", 400));
    }

    if (new Date() > forgotPasswordRequest.expiresAt) {
      await forgotPasswordRequest.update({ isActive: false });
      return next(new ErrorHandler("Link has expired", 400));
    }

    res.status(200).json({ success: true, message: "Reset link is valid" });
  } catch (err) {
    console.log(err);
    return next(new ErrorHandler("Failed to verify reset link", 500));
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const id = req.params.id;

    const forgotPasswordRequest = await ForgotPasswordRequest.findOne({ id });

    if (!forgotPasswordRequest || !forgotPasswordRequest.isActive) {
      return res.status(400).json({ message: "Link expired or invalid" });
    }

    if (new Date() > forgotPasswordRequest.expiresAt) {
      await forgotPasswordRequest.update({ isActive: false });
      return res.status(400).json({ message: "Link has expired" });
    }

    const user = await User.findById(forgotPasswordRequest.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.tokenVersion = user.tokenVersion + 1;

    forgotPasswordRequest.isActive = false;

    await user.save();
    await forgotPasswordRequest.save();

    return res
      .status(200)
      .json({ success: true, message: "Password updated sucessfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error updating password" });
  }
};
