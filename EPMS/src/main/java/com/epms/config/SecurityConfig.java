package com.epms.config;

import com.epms.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()

                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()

                        .requestMatchers("/api/auth/me", "/api/auth/change-password").authenticated()

                        .requestMatchers(
                                "/api/notifications",
                                "/api/notifications/**"
                        ).authenticated()

                        /*
                         * Admin-only account and access-control endpoints.
                         * Needed for Admin Dashboard user edit.
                         */
                        .requestMatchers(
                                "/api/users",
                                "/api/users/**",
                                "/api/roles",
                                "/api/roles/**",
                                "/api/permissions",
                                "/api/permissions/**",
                                "/api/role-permissions",
                                "/api/role-permissions/**"
                        ).hasAnyAuthority(ADMIN_AUTHORITIES)

                        /*
                         * HR/Admin dashboard and management endpoints.
                         */
                        .requestMatchers(
                                "/api/dashboard",
                                "/api/dashboard/**",
                                "/api/employees",
                                "/api/employees/**",
                                "/api/hr/employee-accounts",
                                "/api/hr/employee-accounts/**",
                                "/api/appraisal-forms",
                                "/api/appraisal-forms/**",
                                "/api/assessment-forms",
                                "/api/assessment-forms/**",
                                "/api/kpis",
                                "/api/kpis/**",
                                "/api/positions",
                                "/api/positions/**",
                                "/api/departments",
                                "/api/departments/**",
                                "/api/teams",
                                "/api/teams/**"
                        ).hasAnyAuthority(HR_AUTHORITIES)

                        .requestMatchers(
                                "/api/manager",
                                "/api/manager/**"
                        ).hasAnyAuthority(MANAGER_AUTHORITIES)

                        .requestMatchers(
                                "/api/department-head",
                                "/api/department-head/**"
                        ).hasAnyAuthority(DEPARTMENT_HEAD_AUTHORITIES)

                        .requestMatchers(
                                "/api/executive",
                                "/api/executive/**"
                        ).hasAnyAuthority(EXECUTIVE_AUTHORITIES)

                        /*
                         * IMPORTANT:
                         * These exact employee assessment routes must come BEFORE
                         * "/api/employee-assessments/{id}".
                         */
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/template")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/my-latest-draft")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/my-scores")
                        .authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments")
                        .authenticated()

                        .requestMatchers(HttpMethod.PUT, "/api/employee-assessments/{id}")
                        .authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/submit")
                        .authenticated()

                        /*
                         * HR/Admin/Department Head assessment score table.
                         */
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/score-table")
                        .hasAnyAuthority(SCORE_TABLE_AUTHORITIES)

                        /*
                         * Generic ID route must stay AFTER all exact routes above.
                         */
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/{id}")
                        .hasAnyAuthority(SCORE_TABLE_AUTHORITIES)

                        .requestMatchers(
                                "/api/pip",
                                "/api/pip/**",
                                "/api/one-on-one-meetings",
                                "/api/one-on-one-meetings/**",
                                "/api/one-on-one-action-items",
                                "/api/one-on-one-action-items/**"
                        ).authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }
}