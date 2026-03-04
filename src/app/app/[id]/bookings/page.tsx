import {
  listAmenities,
  listBookings,
  getUnitsForBooking,
  getExpenseItemsForAmenity,
  getFinancialAccountsForRefund,
} from "./actions";
import BookingsPageClient from "./components/BookingsPageClient";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [amenities, bookings, units, expenseItems, financialAccounts] =
    await Promise.all([
      listAmenities(id),
      listBookings(id),
      getUnitsForBooking(id),
      getExpenseItemsForAmenity(id),
      getFinancialAccountsForRefund(id),
    ]);

  return (
    <BookingsPageClient
      condominiumId={id}
      initialAmenities={amenities}
      initialBookings={bookings}
      units={units}
      expenseItems={expenseItems}
      financialAccounts={financialAccounts}
    />
  );
}
