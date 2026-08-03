import csv
from io import StringIO


def risk_report_to_csv(risk_reports: list[dict]) -> tuple[str, str]:
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "Query",
            "Risk Level",
            "Risk Score",
            "Signals Found",
            "Summary",
            "Recommendations",
            "Analyzed At",
        ]
    )

    for report_data in risk_reports:
        writer.writerow(
            [
                report_data.get("query", ""),
                report_data.get("risk_level", ""),
                report_data.get("risk_score", ""),
                "; ".join(report_data.get("signals_found", [])),
                report_data.get("summary", ""),
                "; ".join(report_data.get("recommendations", [])),
                report_data.get("analyzed_at", ""),
            ]
        )

    return output.getvalue(), "text/csv"


def controls_to_csv(controls: list[dict]) -> tuple[str, str]:
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "Control Name",
            "Evidence",
            "Recommendation",
            "Status",
            "Source Query",
            "Created At",
        ]
    )

    for control in controls:
        writer.writerow(
            [
                control.get("control_name", ""),
                control.get("evidence", ""),
                control.get("recommendation", ""),
                control.get("status", ""),
                control.get("discovered_from_query", ""),
                control.get("created_at", ""),
            ]
        )

    return output.getvalue(), "text/csv"


def risk_report_to_pdf(risk_reports: list[dict]) -> tuple[bytes, str]:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except ImportError:
        raise RuntimeError(
            "reportlab is not installed. Install it with: "
            "pip install reportlab"
        )

    from io import BytesIO

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    body_style = styles["BodyText"]

    story = [
        Paragraph("Compliance Risk Report", title_style),
        Spacer(1, 0.2 * inch),
    ]

    for report_data in risk_reports:
        story.append(
            Paragraph(f"Query: {report_data.get('query', '')}", body_style)
        )
        story.append(
            Paragraph(
                f"Risk Level: {report_data.get('risk_level', '')}",
                body_style,
            )
        )
        story.append(
            Paragraph(
                f"Risk Score: {report_data.get('risk_score', '')}",
                body_style,
            )
        )

        signals = report_data.get("signals_found", [])

        if signals:
            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("Signals Found", heading_style))
            for signal in signals:
                story.append(Paragraph(f"- {signal}", body_style))

        evidence = report_data.get("evidence", [])

        if evidence:
            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("Evidence", heading_style))
            for item in evidence:
                story.append(
                    Paragraph(
                        f"- {item.get('evidence', '')} "
                        f"({item.get('source_path', '')})",
                        body_style,
                    )
                )

        recommendations = report_data.get("recommendations", [])

        if recommendations:
            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("Recommendations", heading_style))
            for recommendation in recommendations:
                story.append(Paragraph(f"- {recommendation}", body_style))

        summary = report_data.get("risk_summary")

        if summary:
            story.append(Spacer(1, 0.2 * inch))
            story.append(Paragraph("Summary", heading_style))
            story.append(Paragraph(summary, body_style))

        story.append(Spacer(1, 0.3 * inch))

    document.build(story)

    return buffer.getvalue(), "application/pdf"
