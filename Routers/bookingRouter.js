// requirments
const express = require('express');
let bookingRouter = express.Router();
let bookingModel = require("../models/bookingModel")
let userModel = require("../models/userModel");
const { protectedRoute, bodyChecker, isAuthorized } = require("./authHelper");
const { 
    getElement, getElements,
    updateElement,
    getElementById } = require("../helpers/factory");

const updatebooking = updateElement(bookingModel);
const getbooking = getElement(bookingModel);
const getbookings = getElements(bookingModel);
const getbookingById = getElementById(bookingModel);

const Razorpay = require("razorpay");
let { KEY_ID, KEY_SECRET } = process.env         //||  require("../secrets");
var razorpay = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
});
// createbooking
const initiateBooking = async function (req, res) {
    try {
        let booking = await bookingModel.create(req.body);
        let bookingId = booking["_id"];
        let userId = req.body.user;
        let user = await userModel.findById(userId);
        user.bookings.push(bookingId);
        await user.save();
        const payment_capture = 1;
        const amount = 500;
        const currency = "INR";
        const options = {
            amount,
            currency,
            receipt: `rs_${bookingId}`,
            payment_capture,
        };
        const response = await razorpay.orders.create(options);
        console.log(response);
        res.status(200).json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
            booking: booking,
            message: "booking created",
        });
    }
    catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
}
async function verifyPayment(req, res) {
    // JWT 
    const secret = KEY_SECRET

    // console.log(req.body);
    // 
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    console.log(digest, req.headers["x-razorpay-signature"]);

    if (digest === req.headers["x-razorpay-signature"]) {
        console.log("request is legit");
        res.status(200).json({
            message: "OK",
        });
    } else {
        res.status(403).json({ message: "Invalid" });
    }
};


const deleteBooking = async function(req,res){
    try{
        let booking = await bookingModel.findByIdAndDelete(req.body.id);
        let userID = booking.user; 

        let user = await userModel.findById(userID);
       let idxOfBooking = user.bookings.indexOf(booking["_id"]);
       user.booking.splice(idxOfBooking,1);
        await user.save();

        res.status(200).json({
            message:"booking created",
            booking:booking
        })
    }catch(err){
        res.status(500).json({
            message:err.message
        })
    }
}



// routes-> id
bookingRouter.use(protectedRoute);
bookingRouter
    .route("/:id")
    .get(getbookingById)
    .patch(updatebooking)
    // .delete(deleteBooking)
// ****************************************************
bookingRouter
    .route("/")
    .get(getbookings)
    // .post(createBooking);
// cron job -> 5 second -> average rating 
// createbooking
module.exports = bookingRouter;