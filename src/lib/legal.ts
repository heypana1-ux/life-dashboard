/*
  Operator details for the imprint (§ 5 DDG) and the privacy notice (Art. 13 GDPR).

  ▸ FILL THIS IN BEFORE PUBLISHING. Everything else reads from here, so the imprint, the
    privacy notice and the contact addresses can never drift apart. While a required field is
    empty both legal pages show a visible warning instead of pretending to be complete — an
    imprint with placeholders in it is worse than no app in the store.

  § 5 DDG requires a *ladungsfähige Anschrift*: a real street address where you can be served
  legal mail. A P.O. box does not satisfy it. If you publish as a private individual that is
  your home address, and Google Play will show it publicly on the store listing too.
*/

export interface Operator {
  /** Full legal name, or the company name incl. legal form (e.g. "Life Dashboard UG"). */
  name: string;
  /** Only for a company: the person legally responsible. */
  representedBy?: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  /** § 5 DDG wants a *fast* contact route. Email plus phone is the safe combination. */
  phone?: string;
  /** USt-IdNr. per § 27a UStG — only if you have one. */
  vatId?: string;
  /** Trade register entry, if the business is registered. */
  register?: string;
  /** Set true while you use the Kleinunternehmerregelung (§ 19 UStG). */
  smallBusiness?: boolean;
}

export const OPERATOR: Operator = {
  name: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "heypana1@gmail.com",
  phone: "",
  vatId: "",
  smallBusiness: true,
};

/** The supervisory authority users can complain to — the one for the operator's Bundesland. */
export const SUPERVISORY_AUTHORITY = {
  name: "Die Landesbeauftragte für den Datenschutz und die Informationsfreiheit",
  hint: "Zuständig ist die Aufsichtsbehörde des Bundeslandes, in dem der Betreiber seinen Sitz hat.",
  url: "https://www.bfdi.bund.de/DE/Service/Anschriften/Laender/Laender-node.html",
};

/** The date the current version of the privacy notice took effect. */
export const PRIVACY_UPDATED = "2026-09-04";

/** Bumped whenever the consent wording changes — stored with each given consent, so you can
 *  tell which version a user agreed to and re-ask when it materially changes. */
export const CONSENT_VERSION = 1;

/** True once every field § 5 DDG requires is filled in. */
export function operatorComplete(o: Operator = OPERATOR): boolean {
  return Boolean(o.name && o.street && o.postalCode && o.city && o.country && o.email);
}

export function operatorAddressLines(o: Operator = OPERATOR): string[] {
  return [o.name, o.representedBy, o.street, `${o.postalCode} ${o.city}`.trim(), o.country].filter(
    (l): l is string => Boolean(l && l.trim()),
  );
}
