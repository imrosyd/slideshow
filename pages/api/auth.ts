import type { NextApiRequest, NextApiResponse } from "next";

type SuccessResponse = {
  success: boolean;
};

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Metode ${req.method} tidak diizinkan.` });
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  console.log("Server ADMIN_PASSWORD:", adminPassword);
  console.log("Received password:", password);

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD tidak diatur di environment variables.");
    return res.status(500).json({ error: "Konfigurasi server salah." });
  }

  if (password && password === adminPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ error: "Kata sandi salah." });
  }
}
