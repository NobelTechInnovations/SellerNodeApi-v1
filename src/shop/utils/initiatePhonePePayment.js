// utils/initiatePhonePePayment.js
import fetch from "node-fetch";
const getPhonePeToken = async () => {
  const url = `${process.env.PHONEPE_BASE_URL}/v1/oauth/token`;

  const params = new URLSearchParams();

  params.append("client_id", process.env.PHONEPE_CLIENT_ID || "");
  params.append("client_version", process.env.PHONEPE_CLIENT_VERSION || "2023-01-01");
  params.append("client_secret", process.env.PHONEPE_CLIENT_SECRET || "");
  params.append("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get PhonePe token: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("No access token received from PhonePe");
  }

  return data.access_token;
};

// Initiate PhonePe payment
const initiatePhonePePayment = async ({ merchantOrderId, amount, redirectUrl, message }) => {
  try {
    const accessToken = await getPhonePeToken();

    const response = await fetch(`${process.env.PHONEPE_BASE_URL}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        merchantOrderId,
        amount,
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: message || "Payment initiated",
          merchantUrls: { redirectUrl },
        },
      }),
    });

    console.log("PhonePe API Response Status:", response.status);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { success: false, error: data?.message || "PhonePe API call failed" };
    }

    const redirectUrlResult = data?.redirectUrl || data?.data?.instrumentResponse?.redirectInfo?.url;

    if (!redirectUrlResult) {
      return { success: false, error: "Missing redirect URL in PhonePe response", rawResponse: data };
    }

    return { success: true, merchantOrderId, redirectUrl: redirectUrlResult, rawResponse: data };
  } catch (err) {
    console.error("❌ Exception during PhonePe API call:", err);
    return { success: false, error: err.message || "Unexpected error while initiating PhonePe payment" };
  }
};

export default { getPhonePeToken, initiatePhonePePayment };
