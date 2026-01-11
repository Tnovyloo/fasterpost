"use client";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 pt-32">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Terms and Conditions</h1>
          <p className="text-gray-500 mb-8 text-sm">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-blue max-w-none space-y-8 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                Welcome to FasterPost. These Terms and Conditions govern your use of our website and automated parcel locker services.
                By accessing or using our service, you agree to be bound by these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Service Description</h2>
              <p>
                FasterPost provides automated logistics services allowing users to send and receive packages via our network of
                Postmats (parcel lockers). Our service includes package registration, payment processing, tracking, and delivery facilitation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
              <p>
                To use certain features of the Service (such as sending packages or viewing history), you must register for an account. 
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Sending Packages</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Declarations:</strong> You must accurately declare the size (Small, Medium, Large) and weight of your package. Incorrect declarations may result in additional charges or refusal of service.</li>
                <li><strong>Prohibited Items:</strong> You may not send hazardous materials, illegal goods, weapons, perishables, or any other items prohibited by local law.</li>
                <li><strong>Packaging:</strong> You are responsible for ensuring your items are securely packed to withstand normal handling during transit.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payments and Modifications</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Pricing:</strong> Shipping fees are calculated based on the selected package size, weight, and route distance. Prices are displayed prior to payment.</li>
                <li><strong>Payment Processing:</strong> Payment must be completed via our supported payment processors (e.g., Stripe) to confirm a shipment.</li>
                <li>
                    <strong>No Edits After Payment:</strong> To ensure logistical efficiency, 
                    <span className="text-red-600 font-semibold"> once payment is successfully processed, the shipment is considered final.</span> 
                    You cannot edit package details, including recipient information, locker selection, or package size, after payment is complete. 
                    Please review all details carefully before paying.
                </li>
                <li><strong>Cancellations:</strong> Unpaid packages may be cancelled or modified at any time. Paid packages cannot be modified.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Delivery and Pickup</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Postmats:</strong> Packages are delivered to the destination Postmat selected during creation. If a specific locker is unavailable, we may route to the nearest available locker.</li>
                <li><strong>Pickup Codes:</strong> A unique unlock code will be generated for the recipient. The recipient is responsible for keeping this code secure.</li>
                <li><strong>Pickup Window:</strong> Packages are reserved in the locker for <strong>24 hours</strong> after delivery. Failure to pick up within this window may result in the package being returned to a warehouse.</li>
                <li><strong>Anonymous Pickup:</strong> Recipients may pick up packages without an account using the secure unlock code and verifying their contact information (email or phone).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Liability</h2>
              <p>
                FasterPost is not liable for indirect, incidental, special, consequential or punitive damages, including without limitation,
                loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                Our liability is limited to the cost of the shipping service provided.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Privacy</h2>
              <p>
                We collect and process personal data (such as names, phone numbers, and emails) solely for the purpose of providing our logistics services.
                Payment data is processed securely by Stripe and is not stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at support@fasterpost.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}