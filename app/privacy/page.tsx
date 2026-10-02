import type { Metadata } from "next";
import LegalPage, { GITHUB_URL } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Mail-man accesses in your Gmail, what it stores, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2, 2026">
      <section>
        <p>
          Mail-man is an AI email client for Gmail. This page explains what it reads, what it keeps, who it
          shares data with, and how to remove it. The short version: your email stays in Gmail, Mail-man stores
          only what its features need, and nothing is sold or used for advertising.
        </p>
      </section>

      <section>
        <h2>What Mail-man accesses</h2>
        <p>When you sign in with Google, you allow Mail-man to:</p>
        <ul>
          <li>see your name, email address and profile picture, to identify your account;</li>
          <li>read your email (<code>gmail.readonly</code>), to show your mailbox and run the AI features;</li>
          <li>send email on your behalf (<code>gmail.send</code>), only when you press Send;</li>
          <li>
            change your mail (<code>gmail.modify</code>), only when you act: marking as read, starring, archiving,
            moving to spam or trash, and saving drafts.
          </li>
        </ul>
        <p>Mail-man never sends or changes mail on its own, and never permanently deletes email, except drafts you choose to discard.</p>
      </section>

      <section>
        <h2>What Mail-man stores</h2>
        <p>Mail-man keeps the following in its database (MongoDB Atlas):</p>
        <ul>
          <li>your account email address;</li>
          <li>
            your AI API keys, encrypted with AES-256-GCM before they are saved, and which AI provider you chose. Keys are only
            used by the server and are never sent back to your browser;
          </li>
          <li>your Smart Label names and descriptions, and your to-do list;</li>
          <li>
            short-lived request counters (your email address and how many requests you made), used to limit
            abuse and deleted automatically within an hour;
          </li>
          <li>
            AI results for emails it has analysed: the Gmail message ID, a category, a one-line summary, whether
            the email needs a reply, a suggested reply, and the Smart Labels applied. Summaries and suggested
            replies are written from the email&apos;s content.
          </li>
        </ul>
        <p>
          Mail-man does not keep copies of your email bodies, attachments or contacts. Your sign-in session,
          including the Google access token, is kept in an encrypted cookie in your browser, not in the database.
          To load faster, your browser also keeps a copy of the latest inbox list (senders, subjects and short
          previews) in local storage on your device.
        </p>
      </section>

      <section>
        <h2>AI providers</h2>
        <p>
          AI features run on the AI provider whose key you add: Google Gemini, OpenAI or Anthropic. When a feature
          runs, Mail-man sends that provider the parts of your email it needs, such as the sender, subject and
          text, using your key. That provider handles the data under its own terms and privacy policy, and bills
          your key for the usage. Some providers&apos; free tiers may use what they receive to improve their models,
          so check your provider&apos;s terms. If you don&apos;t add a key, no email content is sent to any AI provider.
        </p>
      </section>

      <section>
        <h2>Google user data</h2>
        <p>
          Mail-man&apos;s use and transfer of information received from Google APIs to any other app will adhere to
          the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. In particular, Gmail data is used only to provide the features
          you see in the app. It is not sold, not used for advertising, and Mail-man does not use it to train AI models.
          People don&apos;t read it unless you ask for help with a specific message, or it is needed for security
          or to comply with the law.
        </p>
      </section>

      <section>
        <h2>Sharing</h2>
        <p>Mail-man does not sell or rent your data. It is processed only by the services that run the app:</p>
        <ul>
          <li>Vercel, which hosts the app;</li>
          <li>MongoDB Atlas, which hosts the database;</li>
          <li>Google, for sign-in and Gmail;</li>
          <li>the AI provider you choose, as described above.</li>
        </ul>
        <p>Mail-man has no ads, analytics or tracking scripts, and sets no cookies other than the ones sign-in needs.</p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          In the app, open Settings and choose <strong>Delete my data</strong>. This deletes your keys, labels,
          to-dos and AI results, revokes Mail-man&apos;s access to your Google account, and signs you out. Your
          Gmail is not affected. You can also remove access at any time from your{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions</a>.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the date at the top changes too. Questions or requests can be filed as an issue on{" "}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
      </section>
    </LegalPage>
  );
}
