import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>
          Schedule and manage Shopify sales with ease
        </h1>

        <p className={styles.text}>
          Summer Sale helps Shopify merchants schedule temporary product
          discounts and automatically restore original prices when a sale ends.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="your-store.myshopify.com"
              />
              <span>Enter your Shopify store domain to continue.</span>
            </label>

            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}

        <ul className={styles.list}>
          <li>
            <strong>Schedule sales</strong>. Set a start and end time for
            temporary product price changes.
          </li>

          <li>
            <strong>Automatic price restoration</strong>. Original product
            prices are restored when a scheduled sale ends.
          </li>

          <li>
            <strong>Safe price management</strong>. Sale changes are tracked so
            your store can recover from failed updates and avoid overwriting
            prices changed manually by the merchant.
          </li>
        </ul>
      </div>
    </div>
  );
}
