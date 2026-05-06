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

    private static final String[] HR_AUTHORITIES = {
            "HR",
            "ROLE_HR",
            "ADMIN",
            "ROLE_ADMIN"
    };

    private static final String[] EMPLOYEE_AUTHORITIES = {
            "Employee",
            "ROLE_Employee",
            "EMPLOYEE",
            "ROLE_EMPLOYEE"
    };

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

                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()

                        .requestMatchers("/api/auth/me", "/api/auth/change-password").authenticated()

                        /*
                         * HR/Admin dashboard and management endpoints.
                         * Include both exact path and wildcard path.
                         */
                        .requestMatchers(
                                "/api/dashboard",
                                "/api/dashboard/**",
                                "/api/employees",
                                "/api/employees/**",
                                "/api/appraisal-forms",
                                "/api/appraisal-forms/**",
                                "/api/assessment-forms",
                                "/api/assessment-forms/**",
                                "/api/kpis",
                                "/api/kpis/**",
                                "/api/positions",
                                "/api/positions/**",
                                "/api/departments",
                                "/api/departments/**"
                        ).hasAnyAuthority(HR_AUTHORITIES)

                        /*
                         * HR/Admin assessment score table.
                         * This must be before the general employee assessment rules.
                         */
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/score-table")
                        .hasAnyAuthority(HR_AUTHORITIES)

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/{id}")
                        .hasAnyAuthority(HR_AUTHORITIES)

                        /*
                         * Employee self-assessment endpoints.
                         */
                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/template")
                        .hasAnyAuthority(EMPLOYEE_AUTHORITIES)

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/my-latest-draft")
                        .hasAnyAuthority(EMPLOYEE_AUTHORITIES)

                        .requestMatchers(HttpMethod.GET, "/api/employee-assessments/my-scores")
                        .hasAnyAuthority(EMPLOYEE_AUTHORITIES)

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments")
                        .hasAnyAuthority(EMPLOYEE_AUTHORITIES)

                        .requestMatchers(HttpMethod.PUT, "/api/employee-assessments/{id}")
                        .hasAnyAuthority(EMPLOYEE_AUTHORITIES)

                        .requestMatchers(HttpMethod.POST, "/api/employee-assessments/{id}/submit")
                        .hasAnyAuthority(EMPLOYEE_AUTHORITIES)

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