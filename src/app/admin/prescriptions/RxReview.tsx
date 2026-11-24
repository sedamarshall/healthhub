import { reviewPrescription } from "../actions";

export function RxReview({ orderId }: { orderId: number }) {
  return (
    <form action={reviewPrescription} className="mt-3 space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <textarea name="note" rows={2} className="input" placeholder="Note to customer (required when rejecting, e.g. 'Prescription expired')" />
      <div className="flex gap-2">
        <button name="decision" value="approved" className="btn-primary">Approve (customer can pay)</button>
        <button name="decision" value="rejected" className="btn-danger">Reject & cancel</button>
      </div>
    </form>
  );
}
