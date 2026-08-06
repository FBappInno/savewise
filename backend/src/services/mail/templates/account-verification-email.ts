import type {
  AccountVerificationEmailInput,
} from "../mail-types";

type AccountVerificationEmail = {
  subject: string;
  html: string;
  text: string;
};

export function createAccountVerificationEmail(
  input: AccountVerificationEmailInput,
): AccountVerificationEmail {
  const username =
    escapeHtml(input.username);

  const verificationUrl =
    escapeHtml(input.verificationUrl);

  return {
    subject:
      "Bestätige dein SaveWise-Konto",

    text: [
      `Hallo ${input.username},`,
      "",
      "bestätige deine E-Mail-Adresse, um dein SaveWise-Konto zu aktivieren.",
      "",
      input.verificationUrl,
      "",
      "Der Bestätigungslink ist eine Stunde gültig.",
      "",
      "Falls du dieses Konto nicht erstellt hast, kannst du diese Nachricht ignorieren.",
      "",
      "SaveWise",
      "by FB AppInno",
    ].join("\n"),

    html: `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />

    <title>SaveWise-Konto bestätigen</title>
  </head>

  <body
    style="
      background:#030712;
      color:#f8fafc;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
      margin:0;
      padding:0;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="
        background:#030712;
        padding:32px 14px;
      "
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="
              background:#071426;
              border:1px solid rgba(103,232,249,0.30);
              border-radius:22px;
              max-width:560px;
              overflow:hidden;
            "
          >
            <tr>
              <td
                style="
                  padding:34px 30px 18px;
                  text-align:center;
                "
              >
                <div
                  style="
                    align-items:center;
                    background:rgba(56,189,248,0.13);
                    border:1px solid #67e8f9;
                    border-radius:20px;
                    color:#67e8f9;
                    display:inline-flex;
                    font-size:28px;
                    font-weight:900;
                    height:66px;
                    justify-content:center;
                    line-height:66px;
                    text-align:center;
                    width:66px;
                  "
                >
                  S
                </div>

                <div
                  style="
                    color:#f8fafc;
                    font-size:27px;
                    font-weight:900;
                    margin-top:15px;
                  "
                >
                  SaveWise
                </div>

                <div
                  style="
                    color:#94a3b8;
                    font-size:12px;
                    margin-top:5px;
                  "
                >
                  Dein persönliches Wissensuniversum
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 30px 34px;">
                <div
                  style="
                    color:#38bdf8;
                    font-size:10px;
                    font-weight:900;
                    letter-spacing:1.3px;
                    text-transform:uppercase;
                  "
                >
                  E-Mail bestätigen
                </div>

                <h1
                  style="
                    color:#f8fafc;
                    font-size:25px;
                    line-height:1.3;
                    margin:8px 0 14px;
                  "
                >
                  Willkommen, ${username}
                </h1>

                <p
                  style="
                    color:#cbd5e1;
                    font-size:14px;
                    line-height:1.7;
                    margin:0 0 24px;
                  "
                >
                  Bestätige deine E-Mail-Adresse, um dein
                  SaveWise-Konto zu aktivieren und dein
                  Wissensuniversum sicher zu verwenden.
                </p>

                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  style="margin:0 auto;"
                >
                  <tr>
                    <td
                      align="center"
                      bgcolor="#67e8f9"
                      style="
                        border-radius:14px;
                      "
                    >
                      <a
                        href="${verificationUrl}"
                        style="
                          color:#03111e;
                          display:inline-block;
                          font-size:14px;
                          font-weight:900;
                          padding:15px 25px;
                          text-decoration:none;
                        "
                      >
                        Konto bestätigen
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    color:#64748b;
                    font-size:11px;
                    line-height:1.6;
                    margin:25px 0 0;
                    text-align:center;
                  "
                >
                  Der Link ist eine Stunde gültig.
                </p>

                <div
                  style="
                    border-top:1px solid rgba(103,232,249,0.14);
                    margin-top:26px;
                    padding-top:20px;
                  "
                >
                  <p
                    style="
                      color:#64748b;
                      font-size:10px;
                      line-height:1.6;
                      margin:0;
                    "
                  >
                    Falls der Button nicht funktioniert, kopiere
                    diesen Link in deinen Browser:
                  </p>

                  <p
                    style="
                      color:#38bdf8;
                      font-size:10px;
                      line-height:1.6;
                      overflow-wrap:anywhere;
                      word-break:break-all;
                    "
                  >
                    ${verificationUrl}
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td
                style="
                  background:#04101e;
                  border-top:1px solid rgba(103,232,249,0.12);
                  color:#64748b;
                  font-size:10px;
                  padding:17px 30px;
                  text-align:center;
                "
              >
                SaveWise · by FB AppInno · savewiseapp.ch
              </td>
            </tr>
          </table>

          <p
            style="
              color:#475569;
              font-size:10px;
              line-height:1.6;
              margin:18px auto 0;
              max-width:520px;
            "
          >
            Falls du kein SaveWise-Konto erstellt hast,
            kannst du diese Nachricht ignorieren.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function escapeHtml(
  value: string,
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
