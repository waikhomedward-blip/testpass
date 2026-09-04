import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
    title: "Contact TestPass",
    description: "Questions, feedback, problems, ideas — send TestPass a message.",
};

// A real route rather than a modal — Section 2 of the contact spec: it
// needs to be linkable, survive a refresh, work reliably from a mobile
// browser, and accept contextual query params (?reason=&session=&actor=
// &page=) from wherever someone entered it, e.g. an error screen's
// "Contact TestPass" link or the footer's quiet "Contact" link.
export default function ContactPage() {
    return (
        <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
            <h1 className="type-page-title">Contact TestPass</h1>
            <p className="mt-2 text-ink-secondary">Questions, feedback, problems, ideas — send us a message.</p>
            <div className="mt-6">
                <ContactForm />
            </div>
        </div>
        );
}
