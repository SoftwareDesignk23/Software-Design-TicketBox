export interface IAiProvider {
	generateBio(inputText: string): Promise<string>
}
