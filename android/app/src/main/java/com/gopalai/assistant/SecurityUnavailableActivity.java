package com.gopalai.assistant;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Fail-closed launcher until Android device authentication is implemented and verified. */
public class SecurityUnavailableActivity extends Activity {
    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(40, 40, 40, 40);
        layout.setBackgroundColor(0xff0b132b);
        TextView text = new TextView(this);
        text.setText("GopalAI Assistant\n\nAndroid device authentication is not ready yet. This app is locked until it is implemented and tested.");
        text.setGravity(Gravity.CENTER);
        text.setTextColor(0xfff8fafc);
        text.setTextSize(18);
        layout.addView(text);
        Button close = new Button(this);
        close.setText("Close");
        close.setOnClickListener(view -> finish());
        layout.addView(close);
        setContentView(layout);
    }
}
