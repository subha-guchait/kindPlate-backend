const { Cashfree } = require("cashfree-pg");

let cashfree = new Cashfree(
  Cashfree.SANDBOX,
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

const createorder = async (
  orderId,
  orderAmount,
  orderCurrency,
  customerID,
  customerPhone,
  customerName,
  customerEmail
) => {
  try {
    console.log(
      orderId,
      orderAmount,
      orderCurrency,
      customerID,
      customerPhone,
      customerName,
      customerEmail
    );
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    const formattedExpiryDate = expiryDate.toISOString();

    const request = {
      order_amount: orderAmount,
      order_currency: orderCurrency,
      order_id: orderId,
      customer_details: {
        customer_id: String(customerID),
        customer_phone: customerPhone,
        customer_name: customerName,
        customer_email: customerEmail,
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL}/payments/receipt/${orderId}`,
        notify_url: `http://localhost:3000/api/payments/verify/${orderId}`,
        // payment_methods: "cc,dc,upi",
      },
      order_expiry_time: formattedExpiryDate,
    };

    console.log(request);

    const response = await cashfree.PGCreateOrder(request);

    console.log(
      " cashfree services payment session id ",
      response.data.payment_session_id
    );

    return response.data.payment_session_id;
  } catch (err) {
    if (err.response) {
      console.log("Error response data:", err.response.data);
      console.log("Error response status:", err.response.status);
      console.log("Error response headers:", err.response.headers);
    } else {
      console.log("Error:", err.message);
    }
  }
};

const getPaymentStatus = async (orderId) => {
  console.log("order id in get payment status", orderId);
  try {
    const response = await cashfree.PGOrderFetchPayments(orderId);
    let getOrderResponse = response.data;
    let orderStatus;

    if (
      getOrderResponse.filter(
        (transaction) => transaction.payment_status === "SUCCESS"
      ).length > 0
    ) {
      orderStatus = "Success";
    } else if (
      getOrderResponse.filter(
        (transaction) => transaction.payment_status === "PENDING"
      ).length > 0
    ) {
      orderStatus = "Pending";
    } else {
      orderStatus = "Failed";
    }

    console.log("Order Status:", orderStatus);
    return orderStatus;
  } catch (err) {
    if (err.response) {
      console.log("Error response data:", err.response.data);
      console.log("Error response status:", err.response.status);
      console.log("Error response headers:", err.response.headers);
    } else {
      console.log("Error:", err.message);
    }
  }
};

module.exports = { createorder, getPaymentStatus };
