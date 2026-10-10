package ee.forgr.nativepurchases;

import android.util.Log;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.UnfetchedProduct;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Local, read-only product-query diagnostics. Never log accounts or purchases. */
final class GridshardBillingDiagnostics {
    private static final String TAG = "GridshardBilling";
    private static final Set<String> KNOWN_PRODUCTS = new HashSet<>(Arrays.asList(
        "gridshard.season_pass_premium", "gridshard.battle_rewards_premium",
        "gridshard.flux_120", "gridshard.flux_260", "gridshard.flux_480", "gridshard.flux_1050",
        "gridshard.credits_1000", "gridshard.credits_2200", "gridshard.credits_4000", "gridshard.credits_9000"
    ));

    private GridshardBillingDiagnostics() {}

    static void report(BillingResult result, QueryProductDetailsResult query) {
        // Counts and typed numeric codes only: no SDK debug message, toString,
        // price, offer token, purchase token, account ID or receipt payload.
        Log.d(TAG, "query code=" + result.getResponseCode()
            + " fetched=" + query.getProductDetailsList().size()
            + " unfetched=" + query.getUnfetchedProductList().size());
        for (UnfetchedProduct product : query.getUnfetchedProductList()) {
            if (!KNOWN_PRODUCTS.contains(product.getProductId())
                || !BillingClient.ProductType.INAPP.equals(product.getProductType())) continue;
            Log.d(TAG, "unfetched product=" + product.getProductId() + " status=" + product.getStatusCode());
        }
    }
}
