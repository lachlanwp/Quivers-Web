import { api, errorMessage } from "../api/client";
import { band, type BandState } from "../data/band";
import { track } from "../lib/analytics";
import { qs, qsa } from "../lib/dom";

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const newsletterEnabled = (state: BandState): boolean =>
  Boolean(state.userId && state.settings?.newsletter_enabled && state.settings.admin_newsletter_enabled);

export const contactFormEnabled = (state: BandState): boolean =>
  Boolean(state.userId && state.settings?.contact_form_enabled);

export const joinMailingList = async (email: string): Promise<void> => {
  await api.mailingListControllerCreate({ email_address: email.trim(), user_id: band.get().userId });
  track("sign_up", { method: "mailing_list" });
};

const setMessage = (form: HTMLElement, text: string, tone: "error" | "success" | "" = "") => {
  const message = qs(".form-message", form);
  if (!message) return;
  message.textContent = text;
  message.className = `form-message ${tone ? `form-message-${tone}` : ""}`;
};

/** Mailing list signups (the footer has one on every page). */
export const initNewsletterForms = (): void => {
  band.subscribe((state) => {
    for (const block of qsa("[data-newsletter]")) block.hidden = !newsletterEnabled(state);
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target as HTMLFormElement;
    if (!form.matches("[data-newsletter-form]")) return;
    event.preventDefault();
    const input = qs<HTMLInputElement>('input[type="email"]', form)!;
    const button = qs<HTMLButtonElement>('button[type="submit"]', form)!;
    if (!isEmail(input.value)) {
      input.setAttribute("aria-invalid", "true");
      setMessage(form, "Enter a valid email address.", "error");
      return input.focus();
    }
    input.removeAttribute("aria-invalid");
    button.disabled = true;
    setMessage(form, "");
    try {
      await joinMailingList(input.value);
      form.reset();
      setMessage(form, "You're on the list. Thanks!", "success");
    } catch (error) {
      setMessage(form, errorMessage(error, "Sorry, that didn't work. Please try again."), "error");
    } finally {
      button.disabled = false;
    }
  });
};

/** The "send us a message" form on the contact page. */
export const bindContactForm = (form: HTMLFormElement): (() => void) => {
  const onSubmit = async (event: Event) => {
    event.preventDefault();
    const field = (name: string) => qs<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`, form)!;
    const name = field("name");
    const email = field("email");
    const message = field("message");
    const problems: [HTMLElement, string][] = [];
    if (!name.value.trim()) problems.push([name, "Enter your name."]);
    if (!isEmail(email.value)) problems.push([email, "Enter a valid email address."]);
    if (!message.value.trim()) problems.push([message, "Enter a message."]);
    for (const input of [name, email, message]) input.removeAttribute("aria-invalid");
    if (problems.length) {
      problems.forEach(([input]) => input.setAttribute("aria-invalid", "true"));
      setMessage(form, problems[0][1], "error");
      return problems[0][0].focus();
    }

    const button = qs<HTMLButtonElement>('button[type="submit"]', form)!;
    button.disabled = true;
    setMessage(form, "Sending…");
    try {
      await api.contactDetailsControllerSendContactForm(band.get().userId, {
        name: name.value.trim(),
        email_address: email.value.trim(),
        message: message.value.trim(),
        recaptcha: "",
      });
      form.reset();
      setMessage(form, "Thanks! Your message has been sent and we'll get back to you soon.", "success");
      track("contact_form_sent");
    } catch (error) {
      setMessage(form, errorMessage(error, "Sorry, your message couldn't be sent. Please try again."), "error");
    } finally {
      button.disabled = false;
    }
  };
  form.addEventListener("submit", onSubmit);
  return () => form.removeEventListener("submit", onSubmit);
};
