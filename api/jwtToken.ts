// /api/jwtToken.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCORS } from "./cors";
//import { GoogleAuth } from 'google-auth-library';
//import jwt from 'jsonwebtoken'

async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	// this function now just calls an API service to create a pass
	// the remote API will call the wallet-pass-callback API to store the pass
	// @ts-ignore
	const { campaign, ethAddress, cardId, baseUrl } = req.body;

	//need a database of cardId to templateId
	//TODO: pull this from API, can be supplied to this API from the frontend, so, would need to be given by the cardDetails API
	const templateId = "fa19039a-7e3e-45ed-af60-c1b319b054cb";

	const passPayload = {
		id: `${cardId}-${ethAddress}`,
		callbackUrl: `${baseUrl}/api/wallet-pass-callback`,
		params: {
			templateId: templateId,
			platform: "google",
			externalId: `${cardId}-${ethAddress}`,
			pass: {
				logo: {
					sourceUri: {
						uri: "https://pub-17883891749c4dd484fccf6780697b62.r2.dev/metadataemp/passkey-modified.png",
					},
				},
			},
		},
	};

	console.log(`Pass Payload: ${JSON.stringify(passPayload)}`);

	const myHeaders = new Headers();
	myHeaders.append("x-stl-key", `${process.env.X_STL_KEY}`);
	myHeaders.append("Content-Type", "application/json");
	if (process.env.BEARER_TOKEN) {
		myHeaders.append("Authorization", `Bearer ${process.env.BEARER_TOKEN}`);
	}

	const postData = {
		method: "POST",
		body: JSON.stringify(passPayload),
		headers: myHeaders,
		redirect: "follow",
	};
	try {
		const response = await fetch(
			`${process.env.WALLET_PASS_URL}/wallet-passes`,
			postData
		);
		const data = await response.json();
		res.status(200).json(data);
	} catch (error) {
		console.log(`Error fetch ${process.env.WALLET_PASS_URL}/wallet-passes`);
		console.log(postData);
		console.error(error);
		res.status(500).json({ error: "Error creating pass" });
	}
}

export default withCORS(handler);
